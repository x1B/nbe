/**
 * Offers operations on the graph model, with undo/redo and model consistency.
 */
define( [], function() {
   'use strict';

   /**
    * @param {object} model
    *    the graph model to operate on
    * @param {object} types
    *    edge types available on the current graph
    * @param {object} ops
    *    the operations stack managing undo/redo for all operations performed on the current graph
    * @param {object} layoutController
    *    a controller for the edges' and vertices' view model
    * @param {object} linksController
    *    a controller for the links' view model
    * @param {Object} idGenerator
    *    to provide an id generator for newly formed edges
    * @param {Function} nextTick
    *    a helper to apply functions asynchronously
    */
   return function( model, typesModel, ops, linksController, layoutController, idGenerator ) {

      var generateEdgeId = idGenerator.create(
         Object.keys( typesModel ).map( function( _ ) {
            return _.toLocaleLowerCase() + ' ';
         } ),
         model.edges
      );

      return {
         connect: makeConnectOp,
         disconnect: makeDisconnectOp,
         deleteVertex: makeDeleteVertexOp,
         deleteEdge: makeDeleteEdgeOp,
         cut: makeCutOp
      };

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function createEdge( fromRef, toRef ) {
         var type = fromRef.port.type;
         var prefix = type.toLocaleLowerCase() + ' ';
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
            layoutController.centerEdge( id, fromRef, toRef );
            linksController.create( fromRef, edgeRef );
            linksController.create( edgeRef, toRef );
         }

         return id;
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

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

            var enforceCardinalityOp = makeEnforceCardinalityOp( toEdgeId, type, vertexRef.port.direction );
            var edgeRef = { nodeId: toEdgeId };

            var connectPortToEdgeOp = function() {
               vertexRef.port.edgeId = toEdgeId;
               var link = linksController.create( vertexRef, edgeRef );
               connectPortToEdgeOp.undo = makeCutOp( link );
            };

            return ops.compose( [ enforceCardinalityOp, connectPortToEdgeOp ] );
         }

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         /** If mandated by the edge type, delete one link to this edge (allowing to form a new link). */
         function makeEnforceCardinalityOp( edgeId, type, portDirection ) {
            var restrictDests = portDirection === 'in';
            var limit = typesModel[ type ] && typesModel[ type ][ restrictDests ? 'maxDestinations' : 'maxSources' ];
            if( limit === undefined ) {
               return ops.noOp;
            }

            var disconnectOps = [];
            var counter = 0;
            var links = linksController.byEdge( edgeId );
            Object.keys( links ).forEach( function( linkId ) {
               var link = links[ linkId ];
               if( link[ restrictDests ? 'source' : 'dest' ].nodeId === edgeId ) {
                  ++counter;
                  if( counter >= limit ) {
                     disconnectOps.push( makeDisconnectOp( link[ restrictDests ? 'dest' : 'source' ] ) );
                  }
               }
            } );
            return ops.compose( disconnectOps );
         }

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         function makeConnectPortToPortOp( fromRef, toRef ) {
            if( fromRef.port.type !== toRef.port.type ||
               fromRef.port.direction === toRef.port.direction ) {
               return ops.noOp;
            }

            var sequence = [];
            [ fromRef, toRef ].forEach( function( ref ) {
               var isDest = isInput( ref.port );
               var typeDef = typesModel[ ref.port.type ];
               if( !( typeDef.simple && 1 === (isDest ? typeDef.maxDestinations : typeDef.maxSources) ) ) {
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
                  connectPortToPortOp.undo = makeCutOp( link );
               }

               layoutController.pingEdge( edgeId );
            }

            sequence.push( connectPortToPortOp );
            return ops.compose( sequence );
         }
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function makeCutOp( link ) {
         var edgeId = ( link.source.port || link.dest.port ).edgeId;
         var edge = model.edges[ edgeId ];

         var cutLink = function() {
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
               cutLink.undo = ops.compose( [
                  function() {
                     model.edges[ edgeId ] = edge;
                  }, cutLink.undo
               ] );
            }
         };
         cutLink.undo = function() {
            [ link.source, link.dest ].forEach( function( ref ) {
               if( ref.port ) {
                  ref.port.edgeId = edgeId;
               }
            } );
            linksController.create( link.source, link.dest );
         };
         return cutLink;
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function makeDisconnectOp( ref ) {
         Object.freeze( ref );
         var portLinks = linksController.byPort( ref.nodeId, ref.port );
         if( portLinks.length === 0 ) {
            return ops.noOp;
         }
         return ops.compose( portLinks.map( function( link ) {
            return makeCutOp( link );
         } ) );
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function makeDeleteEdgeOp( edgeId ) {
         var links = linksController.byEdge( edgeId );
         var linkIds = Object.keys( links );
         return ops.compose( linkIds.map( function( linkId ) {
            return makeCutOp( links[ linkId ] );
         } ) );
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function makeDeleteVertexOp( vertexId ) {
         var steps = [];
         var vertex = model.vertices[ vertexId ];
         vertex.ports.forEach( function( port ) {
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

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function isInput( port ) {
      return port && port.direction === 'in';
   }

} );