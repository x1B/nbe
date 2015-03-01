/**
 * Offers operations on the graph model, with undo/redo
 */
define( [ 'angular', '../utilities/traverse' ], function( ng, traverse ) {
   'use strict';

   var IN = 'inbound';

   /**
    * @param {boolean} readonly
    *    if true, model-changing operations may be performed
    * @param {object} model
    *    the graph model to operate on
    * @param {object} types
    *    edge types available on the current graph
    * @param {object} ops
    *    the operations stack managing undo/redo for all operations performed on the current graph
    * @param {object} canvasController
    *    a controller for the edges' and vertices' view model
    * @param {object} linksController
    *    a controller for the links' view model
    * @param {Object} idGenerator
    *    to provide an id generator for newly formed edges
    * @param {Function} nextTick
    *    a helper to apply functions asynchronously
    */
   return function( readonly, model, layoutModel, typesModel, ops, canvasController, linksController, selectionController, idGenerator ) {

      var generateEdgeId = idGenerator.create(
         Object.keys( typesModel ).map( function( _ ) {
            return _.toLocaleLowerCase() + ' ';
         } ),
         model.edges
      );

      var generateVertexId = idGenerator.create(
         [ 'node' ],
         model.vertices
      );


      var api = {
         perform: ops.perform,
         connect: makeConnectOp,
         disconnect: makeDisconnectOp,
         deleteVertex: makeDeleteVertexOp,
         deleteEdge: makeDeleteEdgeOp,
         insert: makeInsertOp,
         deleteSelected: deleteSelected
      };

      if( readonly ) {
         Object.keys( api ).forEach( function ( k ) {
            api[ k ] = ops.noOp;
         } );
      }

      return api;

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function deleteSelected() {
         var operations = [];
         Object.keys( selectionController.edges() ).forEach( function( eId ) {
            operations.push( makeDeleteEdgeOp( eId ) );
         } );
         Object.keys( selectionController.vertices() ).forEach( function( vId ) {
            operations.push( makeDeleteVertexOp( vId ) );
         } );
         selectionController.clear();
         return ops.compose( operations );
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function createEdge( fromRef, toRef ) {
         var type = fromRef.port.type;
         var prefix = type.toLowerCase() + ' ';
         var id = generateEdgeId( prefix );
         var edgeRef = { nodeId: id };
         model.edges[ id ] = {
            type: type,
            label: id
         };

         fromRef.port.edgeId = id;
         toRef.port.edgeId = id;

         if( typesModel[ type ].simple ) {
            linksController.create( fromRef, toRef );
         }
         else {
            canvasController.centerEdge( id, fromRef, toRef );
            linksController.create( fromRef, edgeRef );
            linksController.create( edgeRef, toRef );
         }

         return id;
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      /**
       * Create an undoable operation to insert a given (type-compatible) graph into this graph.
       * The IDs of edges and vertices from the graph to insert are renamed so that they cannot clash with
       * existing IDs.
       *
       * @param {Object} graphInformation
       *   an object with a model (`graph`) and layout information (`layout`)
       *
       * @returns {Function}
       *   an undoable operation to perform the given insertion
       */
      function makeInsertOp( graphInformation ) {
         var opSequence = [];
         var edgeIdMap = {};

         ng.forEach( graphInformation.graph.edges, function( edge, edgeId ) {
            var newEdgeId = safeEdgeId( edgeId, edge.type );
            opSequence.push( makeCreateEdgeOp( newEdgeId, edge ) );
         } );

         ng.forEach( graphInformation.graph.vertices, function( vertex, vertexId ) {
            traverse.eachPort( vertex, function( port ) {
               if( port.edgeId ) {
                  port.edgeId = safeEdgeId( port.edgeId, port.type );
               }
            } );
            opSequence.push( makeCreateVertexOp( vertexId, vertex ) );
         } );

         return ops.compose( opSequence );

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         function safeEdgeId( edgeId, edgeType ) {
            if( edgeId in edgeIdMap ) {
               return edgeIdMap[ edgeId ];
            }
            if( !(edgeId in model.edges) ) {
               return edgeId;
            }
            edgeIdMap[ edgeId ] = generateEdgeId( edgeType.toLowerCase() + ' ' );
         }

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         /** Create a vertex based on a prototype */
         function makeCreateVertexOp( id, vertexInfo ) {
            var layoutInfo = graphInformation.layout.vertices[ id ];
            function createVertex() {
               id = id in model.vertices ? generateVertexId() : id;
               model.vertices[ id ] = vertexInfo;
               layoutModel.vertices[ id ] = layoutInfo;
               createVertex.undo = makeDeleteVertexOp( id );
            }
            return createVertex;
         }

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         /** Create an edge based on a prototype */
         function makeCreateEdgeOp( id, edgeInfo ) {
            var layoutInfo = graphInformation.layout.edges[ id ];
            function createEdge() {
               model.edges[ id ] = edgeInfo;
               if( layoutInfo ) {
                  layoutModel.edges[ id ] = layoutInfo;
               }
               createEdge.undo = makeDeleteEdgeOp( id );
               return id;
            }
            return createEdge;
         }
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      /**
       * Create an undoable operation that forms a connection between the given refs when executed.
       *
       * @param {Object} fromRef
       *   a ref to begin the new connection at
       * @param {Object} toRef
       *   a ref to end the new connection at
       *
       * @return {Function}
       *   an undoable operation that connects the two ref when executed
       */
      function makeConnectOp( fromRef, toRef ) {
         Object.freeze( fromRef );
         Object.freeze( toRef );

         if( !toRef.port ) {
            return makeConnectPortToEdgeOp( fromRef, toRef.nodeId );
         }
         else if( !fromRef.port ) {
            return makeConnectPortToEdgeOp( toRef, fromRef.nodeId );
         }
         else {
            return makeConnectPortToPortOp( fromRef, toRef );
         }

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         function makeConnectPortToEdgeOp( vertexRef, toEdgeId ) {
            var type = vertexRef.port.type;
            if( type !== model.edges[ toEdgeId ].type ) {
               return ops.noOp;
            }

            var enforceCardinalityOp = makeEnforceCardinalityOp( toEdgeId, type, vertexRef.direction );
            var edgeRef = { nodeId: toEdgeId };

            var connectPortToEdgeOp = function() {
               vertexRef.port.edgeId = toEdgeId;
               var link = linksController.create( vertexRef, edgeRef );
               connectPortToEdgeOp.undo = makeSeverOp( link );
            };

            return ops.compose( [ enforceCardinalityOp, connectPortToEdgeOp ] );
         }

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         /** If mandated by the edge type, delete one link to this edge (allowing to form a new link). */
         function makeEnforceCardinalityOp( edgeId, type, portDirection ) {
            var portInbound = portDirection === IN;
            var limit = typesModel[ type ] && typesModel[ type ][ portInbound ? 'maxDestinations' : 'maxSources' ];
            if( limit === undefined ) {
               return ops.noOp;
            }

            var disconnectOps = [];
            var counter = 0;
            var links = linksController.byEdge( edgeId );
            Object.keys( links ).forEach( function( linkId ) {
               var link = links[ linkId ];
               if( link[ portInbound ? 'source' : 'dest' ].nodeId === edgeId ) {
                  ++counter;
                  if( counter >= limit ) {
                     disconnectOps.push( makeDisconnectOp( link[ portInbound ? 'dest' : 'source' ] ) );
                  }
               }
            } );
            return ops.compose( disconnectOps );
         }

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         function makeConnectPortToPortOp( fromRef, toRef ) {
            if( fromRef.port.type !== toRef.port.type ||
               fromRef.direction === toRef.direction ) {
               return ops.noOp;
            }

            var sequence = [];
            [ fromRef, toRef ].forEach( function( ref ) {
               var typeDef = typesModel[ ref.port.type ];
               var limit = typeDef[ ref.direction === IN ? 'maxDestinations' : 'maxSources' ];
               if( !( typeDef.simple && limit === 1 ) ) {
                  sequence.push( makeDisconnectOp( ref ) );
               }
            } );

            function connectPortToPortOp() {
               var edgeId = fromRef.port.edgeId || toRef.port.edgeId;
               if( !edgeId ) {
                  // collection forms an edge (completely new or has disconnected previous edges)
                  edgeId = createEdge( fromRef, toRef );
                  connectPortToPortOp.undo = makeDeleteEdgeOp( edgeId );
               }
               else {
                  var link = linksController.create( fromRef, toRef );
                  fromRef.port.edgeId = edgeId;
                  toRef.port.edgeId = edgeId;
                  connectPortToPortOp.undo = makeSeverOp( link );
               }
               canvasController.pingEdge( edgeId );
            }

            sequence.push( connectPortToPortOp );
            return ops.compose( sequence );
         }
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      /**
       * Create an undoable operation that severs the given link when executed.
       *
       * @param {Object} link
       *   a link with source and dest ref
       *
       * @return {Function}
       *   an undoable operation
       */
      function makeSeverOp( link ) {
         var edgeId = ( link.source.port || link.dest.port ).edgeId;
         var edge = model.edges[ edgeId ];

         var severLink = function() {
            linksController.destroy( link );
            [ link.source, link.dest ].forEach( function( ref ) {
               var port = ref.port;
               if( port && linksController.byPort( ref.nodeId, port ).length === 0 ) {
                  port.edgeId = null;
               }
            } );
            var remaining = Object.keys( linksController.byEdge( edgeId ) );
            if( remaining.length === 0 ) {
               delete model.edges[ edgeId ];
               severLink.undo = ops.compose( [
                  function() {
                     model.edges[ edgeId ] = edge;
                  }, severLink.undo
               ] );
            }
         };
         severLink.undo = function() {
            [ link.source, link.dest ].forEach( function( ref ) {
               if( ref.port ) {
                  ref.port.edgeId = edgeId;
               }
            } );
            linksController.create( link.source, link.dest, link.id );
         };
         return severLink;
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function makeDisconnectOp( ref ) {
         Object.freeze( ref );
         var portLinks = linksController.byPort( ref.nodeId, ref.port );
         if( portLinks.length === 0 ) {
            return ops.noOp;
         }
         return ops.compose( portLinks.map( function( link ) {
            return makeSeverOp( link );
         } ) );
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function makeDeleteEdgeOp( edgeId ) {
         var links = linksController.byEdge( edgeId );
         var linkIds = Object.keys( links );
         return ops.compose( linkIds.map( function( linkId ) {
            return makeSeverOp( links[ linkId ] );
         } ) );
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function makeDeleteVertexOp( vertexId ) {
         var steps = [];
         var vertex = model.vertices[ vertexId ];
         traverse.eachPort( vertex, function( port ) {
            steps.push( makeDisconnectOp( { nodeId: vertexId, port: port } ) );
         } );

         function deleteVertexOp() {
            delete model.vertices[ vertexId ];
            deleteVertexOp.undo = function deleteVertexUndoOp() {
               model.vertices[ vertexId ] = vertex;
            };
         }

         steps.push( deleteVertexOp );
         return ops.compose( steps );
      }

   };

} );