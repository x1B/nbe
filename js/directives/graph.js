define( [
   'jquery',
   'underscore',
   'angular',
   '../utilities/async',
   '../utilities/operations',
   'text!./graph.html'
],
function ( $, _, ng, async, operationsModule, graphHtml ) {
   'use strict';

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   var DIRECTIVE_NAME = 'nbeGraph';

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   /**
    * The Graph directive controller manages the view-model for the underlying graph.
    * It is mainly concerned with creating and maintaining links and their controllers.
    * Links are visible connections that represent multi-edge membership.
    * Each link has one end at a vertex node's port (input or output) and one end at an edge node.
    */
   function createGraphDirective( $timeout, $window, nbeAutoLayout ) {

      return {
         template: graphHtml,
         replace: true,
         restrict: 'A',
         scope: {
            model: '=nbeGraph',
            layout: '=nbeGraphLayout'
         },
         controller: GraphController
      };

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function GraphController( $scope, $element ) {

         /** Shorthands to $scope.* */

         /** @type {{ edges: {}, vertices: {}<String, {ports: []}> }} */
         var model;
         var layout;
         var view;
         var selection;

         /** Transient members, re-initialized when the model is replaced. */
         var links;
         var linksByEdge;
         var linksByVertex;
         var linkControllers;
         var generateLinkId;
         var generateEdgeId;

         var self = $scope.nbeGraph = this;

         /** Provide access to the jQuery handle to the graph canvas element */
         var jqGraph = this.jqGraph = $( $element[ 0 ] );

         // Controller API:
         this.vertexLinkControllers = vertexLinkControllers;
         this.edgeLinkControllers = edgeLinkControllers;
         this.makeConnectOp = makeConnectOp;
         this.makeDisconnectOp = makeDisconnectOp;
         this.selectEdge = selectEdge;
         this.selectVertex = selectVertex;

         $scope.calculateLayout = function() {
            async.runEventually( function() {
               var autoLayout = nbeAutoLayout.calculate( $scope, jqGraph );
               if ( autoLayout ) {
                  layout = $scope.layout = autoLayout;
               }
               return !!autoLayout;
            }, $window, $scope, 1500 );
         };

         var ops = this.operations = operationsModule.create( $scope );

         initGraph( $scope );

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         function repaint() {
            $scope.canvas = {
               width: jqGraph.width(),
               height: jqGraph.height()
            };

            ng.forEach( linkControllers, function( controller ) {
               controller.repaint();
            } );
         }

         $( window ).on( 'resize', async.ensure( repaint, $timeout, 15 ) );

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         function initGraph( $scope ) {
            model = $scope.model;
            layout = $scope.layout;
            if ( !layout ) {
               $scope.calculateLayout();
            }
            view = $scope.view = {};
            selection = $scope.selection = { kind: null, id: null };

            linksByEdge = { };
            linksByVertex = { };
            self.linkControllers = linkControllers = { };

            links = $scope.view.links = {};
            generateEdgeId = idGenerator( '#', model.edges );
            generateLinkId = idGenerator( 'lnk', links );

            ng.forEach( model.vertices, function( vertex, vertexId ) {
               vertex.ports.filter( function( _ ) { return !!_.edgeId; } ).forEach( function( port ) {
                  var edgeRef = { nodeId: port.edgeId, port: null };
                  var vertexRef = { nodeId: vertexId, port: port };
                  createLink( vertexRef, edgeRef );
               } );
            } );

            $( document ).on( 'keydown', handleKeys );
            repaint();
         }

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         function handleKeys( event ) {
            var KEY_CODE_DELETE = 46, KEY_CODE_Y = 89, KEY_CODE_Z = 90, KEY_CODE_ESCAPE = 0x1B;

            if ( event.keyCode === KEY_CODE_DELETE ) {
               if ( $scope.selection.kind === 'EDGE' ) {
                  ops.perform( makeDeleteEdgeOp( $scope.selection.id ) );
               }
               else if ( $scope.selection.kind === 'VERTEX' ) {
                  ops.perform( makeDeleteVertexOp( $scope.selection.id ) );
               }
            }
            else if ( event.keyCode === KEY_CODE_ESCAPE ) {
               if ( self.dragDrop.transaction() ) {
                  self.dragDrop.cancel();
               }
            }
            else if ( event.metaKey || event.ctrlKey ) {
               if ( event.keyCode === KEY_CODE_Z ) {
                  if ( event.shiftKey ) {
                     ops.redo();
                  }
                  else {
                     ops.undo();
                  }
               }
               else if ( event.keyCode === KEY_CODE_Y ) {
                  ops.redo();
               }
            }
         }

         /////////////////////////////////////////////////////////////////////////////////////////////////////

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

            function makeConnectPortToEdgeOp( vertexRef, toEdgeId ) {
               if ( vertexRef.port.type !== model.edges[ toEdgeId ].type ) {
                  return operationsModule.noOp;
               }
               var edgeRef = { nodeId: toEdgeId };
               function connectPortToEdgeOp() {
                  vertexRef.port.edgeId = toEdgeId;
                  createLink( vertexRef, edgeRef );
               }
               connectPortToEdgeOp.undo = makeDisconnectOp( vertexRef );
               return connectPortToEdgeOp;
            }

            function makeConnectPortToPortOp( fromRef, toRef ) {
               if ( fromRef.port.type !== toRef.port.type ||
                    fromRef.port.direction === toRef.port.direction ) {
                  return operationsModule.noOp;
               }

               var disconnectFromOp = makeDisconnectOp( fromRef );
               var disconnectToOp = makeDisconnectOp( toRef );
               function connectPortToPortOp() {
                  disconnectFromOp();
                  disconnectToOp();
                  var edgeId = createEdge( fromRef, toRef );
                  fromRef.port.edgeId = edgeId;
                  toRef.port.edgeId = edgeId;
                  connectPortToPortOp.undo = function() {
                     makeDeleteEdgeOp( edgeId )();
                     disconnectToOp.undo();
                     disconnectFromOp.undo();
                  };
               }
               return connectPortToPortOp;
            }
         }

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         function makeDisconnectOp( ref ) {
            Object.freeze( ref );

            function disconnectOp() {
               if ( !ref.port.edgeId ) {
                  disconnectOp.undo = operationsModule.noOp;
                  return;
               }
               var edgeId = ref.port.edgeId;
               var link = linkByPort( ref.nodeId, ref.port );

               destroyLink( link );
               delete ref.port.edgeId;
               var removedEdge;
               if ( !Object.keys( linksByEdge[ edgeId ] ).length ) {
                  removedEdge = model.edges[ edgeId ];
                  delete model.edges[ edgeId ];
               }

               disconnectOp.undo = function() {
                  if ( removedEdge ) {
                     model.edges[ edgeId ] = removedEdge;
                  }
                  var edgeRef = { nodeId: edgeId };
                  ref.port.edgeId = edgeId;
                  createLink( ref, edgeRef );
               };
            }

            return disconnectOp;
         }

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         function makeDeleteEdgeOp( edgeId ) {
            var steps = [];
            ng.forEach( model.vertices, function( vertex, vertexId ) {
               vertex.ports.forEach( function( port ) {
                  if( port.edgeId === edgeId ) {
                     steps.push( makeDisconnectOp( { nodeId: vertexId, port: port } ) );
                  }
               } );
            } );
            return operationsModule.compose( steps );
         }

         /////////////////////////////////////////////////////////////////////////////////////////////////////

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
            return operationsModule.compose( steps );
         }

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         function createLink( refA, refB ) {

            var reverse = isInput( refA.port ) || isOutput( refB.port );
            var fromRef = reverse ? refB : refA;
            var toRef = reverse ? refA : refB;

            var link = {
               id: generateLinkId(),
               type: ( fromRef.port || toRef.port ).type,
               source: fromRef,
               dest: toRef
            };

            insert( fromRef, link.id, link );
            insert( toRef, link.id, link );
            links[ link.id ] = link;

            //////////////////////////////////////////////////////////////////////////////////////////////////

            function isInput( port ) {
               return port && port.direction === 'in';
            }

            function isOutput( port ) {
               return port && port.direction !== 'in';
            }

            function insert( ref, linkId, link ) {
               var map = ref.port ? linksByVertex : linksByEdge;
               if ( !map[ ref.nodeId ] ) {
                  map[ ref.nodeId ] = { };
               }
               map[ ref.nodeId ][ linkId ] = link;
            }
         }

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         function createEdge( fromRef, toRef ) {
            var id = generateEdgeId();
            var edgeRef = { nodeId: id };
            var type = fromRef.port.type;
            model.edges[ id ] = {
               type: type,
               label: type.toLowerCase() + ' ' + id
            };
            var fromLayout = layout.vertices[ fromRef.nodeId ];
            var toLayout = layout.vertices[ toRef.nodeId ];
            var centerX = ( parseFloat( fromLayout.left ) + parseFloat( toLayout.left ) ) / 2;
            var centerY = ( parseFloat( fromLayout.top ) + parseFloat( toLayout.top ) ) / 2;
            layout.edges[ id ] = { left: centerX, top: centerY };
            createLink( fromRef, edgeRef );
            createLink( edgeRef, toRef );
            return id;
         }

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         function destroyLink( link ) {
            function remove( map, nodeId, linkId ) {
               delete map[ nodeId ][ linkId ];
            }
            remove( link.source.port ? linksByVertex : linksByEdge, link.source.nodeId, link.id );
            remove( link.dest.port   ? linksByVertex : linksByEdge, link.dest.nodeId,   link.id );
            delete links[ link.id ];
         }

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         function vertexLinkControllers( vertexId ) {
            if( linksByVertex[ vertexId ] === undefined ) {
               return [ ];
            }
            return Object.keys( linksByVertex[ vertexId ] ).map( function( linkId ) {
               return linkControllers[ linkId ];
            } );
         }

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         function edgeLinkControllers( edgeId ) {
            if ( linksByEdge[ edgeId ] === undefined ) {
               return [ ];
            }
            return Object.keys( linksByEdge[ edgeId ] ).map( function( linkId ) {
               return linkControllers[ linkId ];
            } );
         }

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         function linkByPort( vertexId, port ) {
            var portId = port.id;
            var links = linksByVertex[ vertexId ];
            var keys = Object.keys( links );

            for ( var i = keys.length; i --> 0; ) {
               var linkId = keys[ i ];
               var link = links[ linkId ];
               if ( link.source.port && link.source.port.id === portId ) {
                  return link;
               }
               if ( link.dest.port && link.dest.port.id === portId ) {
                  return link;
               }
            }
            return null;
         }

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         function idGenerator( prefix, currentMap ) {
            var prefixLength = prefix ? prefix.length : 0;
            var maxIndex = Object.keys( currentMap )
               .filter( function( k ) { return k.indexOf( prefix ) === 0; } )
               .map( function( k ) { return parseInt( k.substring( prefixLength ), 10 ); } )
               .reduce( function max( a, b ) { return a > b ? a : b; }, -1 );

            return function nextId() {
               ++maxIndex;
               return prefix + maxIndex;
            };
         }

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         function selectEdge( edgeId ) {
            selection.id = edgeId;
            selection.kind = 'EDGE';
         }

         function selectVertex( vertexId ) {
            selection.id = vertexId;
            selection.kind = 'VERTEX';
         }

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         self.dragDrop = ( function() {

            /** When port/link ghosts are dropped, the most recent drop target can be accessed here. */
            var dropRef;

            /** While a port is being dragged, it can be accessed here. */
            var dragRef;

            /** For undo/redo, operations of a single drag/drop interaction are grouped as a transaction. */
            var transaction;

            var onCancel;

            function clear() {
               jqGraph.removeClass( 'highlight-' + dragRef.port.type );
               jqGraph.removeClass( 'highlight-' + ( dragRef.port.direction === 'in' ? 'out' : 'in' ) );
               dropRef = dragRef = transaction = null;
            }

            return Object.freeze( {
               start: function( ref, cancel ) {
                  onCancel = cancel;
                  transaction = ops.startTransaction();
                  dragRef = { nodeId: ref.nodeId, port: ref.port };
                  jqGraph.addClass( 'highlight-' + ref.port.type );
                  jqGraph.addClass( 'highlight-' + ( ref.port.direction === 'in' ? 'out' : 'in' ) );
                  return transaction;
               },

               dropRef: function() {
                  return dropRef;
               },

               transaction: function() {
                  return transaction;
               },

               setDropRef: function( ref ) {
                  dropRef = ref;
               },

               finish: function() {
                  if ( transaction ) {
                     transaction.commit();
                     clear();
                  }
               },

               cancel: function() {
                  if ( transaction ) {
                     transaction.rollBack();
                     clear();
                     onCancel();
                  }
               }
            } );
         } )();

      }

   }


   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   return {
      define: function( module ) {
         module.directive( DIRECTIVE_NAME, [ '$timeout', '$window', 'nbeAutoLayout', createGraphDirective ] );
         module.filter( 'nbeInputPorts', function() {
            return function( ports ) {
               return ports.filter( function( _ ) { return _.direction === 'in'; } );
            };
         } );
         module.filter( 'nbeOutputPorts', function() {
            return function( ports ) {
               return ports.filter( function( _ ) { return _.direction !== 'in'; } );
            };
         } );
      }
   };

} );