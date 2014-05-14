define( [
   'jquery',
   'underscore',
   'angular',
   '../utilities/visual',
   '../utilities/operations',
   'text!./graph.html'
],
function ( $, _, ng, visual, operationsModule, graphHtml ) {
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
   function createGraphDirective( $timeout, $document, layoutSettings, async, autoLayout, idGenerator ) {

      return {
         template: graphHtml,
         replace: true,
         restrict: 'A',
         scope: {
            nbeController: '=nbeGraphController',
            model: '=nbeGraph',
            layout: '=nbeGraphLayout',
            types: '=nbeGraphTypes'
         },
         transclude: true,
         controller: GraphController
      };

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function GraphController( $scope, $element ) {

         /** Shorthands to $scope.* */

         /** @type {{ edges: {}, vertices: {}<String, {ports: []}> }} */
         var model;
         var layout;
         var types;
         var view;

         /** Transient members, re-initialized when the model is replaced. */
         var linksByEdge;
         var linksByVertex;
         var linkControllers;
         var generateLinkId;
         var generateEdgeId;

         // var self = $scope.nbeTools = $scope.nbeController = this;
         var self = $scope.nbeController = this;

         /** Provide access to the jQuery handle to the graph canvas element */
         var jqGraph = this.jqGraph = $( $element[ 0 ] );

         // Controller API:
         this.vertexLinkControllers = vertexLinkControllers;
         this.edgeLinkControllers = edgeLinkControllers;
         this.makeConnectOp = makeConnectOp;
         this.makeDisconnectOp = makeDisconnectOp;

         // Manage layout and rendering:
         this.calculateLayout = calculateLayout;
         this.adjustCanvasSize = adjustCanvasSize;

         var ops = this.operations = operationsModule.create( $scope );

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         $scope.$watch( 'types', function( newTypes ) {
            Object.keys( newTypes ).forEach( function( type ) {
               var hideType = !!( newTypes[ type ] && newTypes[ type ].hidden );
               jqGraph.toggleClass( 'hide-' + type, hideType );
            } );
            repaint();
            adjustCanvasSize();
         }, true );

         $scope.$watch( 'model.vertices', function( newVertices ) {
            if ( newVertices == null ) {
               return;
            }
            ng.forEach( linksByVertex, function( _, vId ) {
               if ( !model.vertices[ vId ] ) {
                  delete linksByVertex[ vId ];
               }
            } );
            ng.forEach( model.vertices, function( vertex, vId ) {
               if ( !linksByVertex[ vId ] ) {
                  linksByVertex[ vId ] = { };
               }
               vertex.ports.filter( function( _ ) { return !!_.edgeId; } ).forEach( function( port ) {
                  var edgeRef = { nodeId: port.edgeId, port: null };
                  var vertexRef = { nodeId: vId, port: port };
                  if ( !linksByVertex[ vId ][ port.id ] ) {
                     createLink( vertexRef, edgeRef );
                  }
               } );
            } );
         } );

         $scope.$watch( 'model.edges', function( newVertices ) {
            if ( newVertices == null ) {
               return;
            }
            ng.forEach( linksByEdge, function( _, eId ) {
               if ( !model.edges[ eId ] ) {
                  delete linksByEdge[ eId ];
               }
            } );
            ng.forEach( model.edges, function( _, eId ) {
               if ( !linksByEdge[ eId ] ) {
                  linksByEdge[ eId ] = { };
               }
            } );
         } );

         initGraph( $scope );

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         /**
          * In each dimension, pick max( offset container size, content size ) and use it as the canvas size.
          */
         function adjustCanvasSize() {
            var offsetContainer = jqGraph.offsetParent();
            var graphOffset = jqGraph.offset();
            var padding = layoutSettings.graphPadding;
            var scollbarSpace = 20;
            var width = offsetContainer.width() - scollbarSpace;
            var height = offsetContainer.height() - scollbarSpace;
            $( '.vertex, .edge', jqGraph[ 0 ] ).each( function( i, domNode ) {
               var jqVertex = $( domNode );
               var pos = jqVertex.offset();
               width = Math.max( width, pos.left - graphOffset.left + jqVertex.width() + padding );
               height = Math.max( height, pos.top - graphOffset.top + jqVertex.height() + padding );
            } );
            jqGraph.width( width ).height( height );
         }

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         function repaint() {
            ng.forEach( linkControllers, function( controller ) {
               controller.repaint();
            } );
         }

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         function initGraph( $scope ) {
            model = $scope.model;
            types = $scope.types || {};
            layout = $scope.layout;
            if ( !layout ) {
               self.calculateLayout();
            }
            view = $scope.view = {
               selection: {
                  vertices: {},
                  edges: {}
               },
               links: {}
            };

            linksByEdge = { };
            linksByVertex = { };
            self.linkControllers = linkControllers = { };

            generateEdgeId = idGenerator.create(
               Object.keys( types ).map( function( _ ) { return _.toLocaleLowerCase() + ' '; } ),
               model.edges
            );
            generateLinkId = idGenerator.create( [ 'lnk' ], {} );

            $document.on( 'keydown', handleKeys );
            repaint();

            $scope.$watch( 'layout', async.ensure( adjustCanvasSize, 50 ), true );
         }

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         function handleKeys( event ) {
            var KEY_CODE_DELETE = 46, KEY_CODE_Y = 89, KEY_CODE_Z = 90, KEY_CODE_ESCAPE = 0x1B;

            if ( event.keyCode === KEY_CODE_DELETE ) {
               self.selection.handleDelete();
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

            //////////////////////////////////////////////////////////////////////////////////////////////////

            function makeConnectPortToEdgeOp( vertexRef, toEdgeId ) {
               var type = vertexRef.port.type;
               if ( type !== model.edges[ toEdgeId ].type ) {
                  return operationsModule.noOp;
               }

               var enforceCardinalityOp = makeEnforceCardinalityOp( toEdgeId, type, vertexRef.port.direction );
               var edgeRef = { nodeId: toEdgeId };
               function connectPortToEdgeOp() {
                  vertexRef.port.edgeId = toEdgeId;
                  createLink( vertexRef, edgeRef );
               }
               connectPortToEdgeOp.undo = makeDisconnectOp( vertexRef );

               return operationsModule.compose( [ enforceCardinalityOp, connectPortToEdgeOp ] );
            }

            //////////////////////////////////////////////////////////////////////////////////////////////////

            /** If mandated by the edge type, delete one link to this edge (allowing to form a new link). */
            function makeEnforceCardinalityOp( edgeId, type, portDirection ) {
               var restrictDests = portDirection === 'in';
               var limit = types[ type ] && types[ type ][ restrictDests ? 'maxDestinations' : 'maxSources' ];
               if ( limit === undefined ) {
                  return operationsModule.noOp;
               }

               var disconnectOps = [];
               var counter = 0;
               var links = linksByEdge[ edgeId ];
               Object.keys( links ).forEach( function( linkId ) {
                  var link = links[ linkId ];
                  if ( link[ restrictDests ? 'source' : 'dest' ].nodeId === edgeId ) {
                     ++counter;
                     if ( counter >= limit ) {
                        disconnectOps.push( makeDisconnectOp( link[ restrictDests ? 'dest' : 'source' ] ) );
                     }
                  }
               } );
               return operationsModule.compose( disconnectOps );
            }

            //////////////////////////////////////////////////////////////////////////////////////////////////

            function makeConnectPortToPortOp( fromRef, toRef ) {
               if ( fromRef.port.type !== toRef.port.type ||
                    fromRef.port.direction === toRef.port.direction ) {
                  return operationsModule.noOp;
               }

               function connectPortToPortOp() {
                  var edgeId = createEdge( fromRef, toRef );
                  fromRef.port.edgeId = edgeId;
                  toRef.port.edgeId = edgeId;
                  $timeout( function() {
                     visual.pingAnimation( $( '[data-nbe-edge="' + edgeId + '"]' ) );
                  } );
                  connectPortToPortOp.undo = makeDeleteEdgeOp( edgeId );
               }
               return operationsModule.compose( [ makeDisconnectOp( fromRef ), makeDisconnectOp( toRef ), connectPortToPortOp ] );
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
            view.links[ link.id ] = link;

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
            var type = fromRef.port.type;
            var prefix = type.toLocaleLowerCase() + ' ';
            var id = generateEdgeId( prefix );
            var edgeRef = { nodeId: id };
            model.edges[ id ] = {
               type: type,
               label: id
            };

            function centerCoords( vertexId ) {
               var vertexLayout = layout.vertices[ vertexId ];
               var jqVertex = $( '[data-nbe-vertex=' + vertexId + ']', jqGraph );
               return [ vertexLayout.left + jqVertex.width()/2, vertexLayout.top + jqVertex.height()/2 ];
            }

            function mean( v1, v2 ) {
               return [ 0, 1 ].map( function( i ) {
                  return Math.round( (v1[i] + v2[i])/2 );
               } );
            }

            var edgeCenter = mean( centerCoords( fromRef.nodeId ), centerCoords( toRef.nodeId ) );
            layout.edges[ id ] = { left: edgeCenter[ 0 ] - layoutSettings.edgeDragOffset,
                                   top: edgeCenter[ 1 ] - layoutSettings.edgeDragOffset };

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
            delete view.links[ link.id ];
         }

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         function vertexLinkControllers( vertexId ) {
            if ( linksByVertex[ vertexId ] === undefined ) {
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

         function calculateLayout() {
            async.runEventually( function() {
               var result = autoLayout.calculate( $scope.model, $scope.types, jqGraph );
               if ( result ) {
                  layout = $scope.layout = result;
                  $timeout( repaint );
                  $timeout( adjustCanvasSize );
               }
               return !!result;
            }, $scope, 1500 );
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

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         self.selection = ( function() {

            function handleDelete() {
               var operations = [];
               ng.forEach( view.selection.vertices, function( selected, vId ) {
                  if( selected ) {
                     operations.push( makeDeleteVertexOp( vId ) );
                  }
               } );
               ng.forEach( view.selection.edges, function( selected, eId ) {
                  if( selected ) {
                     operations.push( makeDeleteEdgeOp( eId ) );
                  }
               } );
               ops.perform( operationsModule.compose( operations ) );
               console.log( model );
            }

            function selectEdge( edgeId, extend ) {
               if ( !extend ) {
                  view.selection = { vertices: {}, edges: {} };
               }
               view.selection.edges[ edgeId ] = true;
            }

            function selectVertex( vertexId, extend ) {
               if ( !extend ) {
                  view.selection = { vertices: {}, edges: {} };
               }
               view.selection.vertices[ vertexId ] = true;
            }

            /////////////////////////////////////////////////////////////////////////////////////////////////////

            jqGraph[ 0 ].addEventListener( 'mousedown', function( event ) {

               if( event.target !== jqGraph[ 0 ] && event.target.nodeName !== 'svg' ) {
                  return;
               }

               var jqSelection = $( '.selection', $element );
               var selection = jqSelection[ 0 ];
               var referenceX = event.pageX;
               var referenceY = event.pageY;
               var fromX = event.offsetX || event.layerX;
               var fromY = event.offsetY || event.layerY;
               updateSelection( event );
               jqSelection.show();
               $document.on( 'mousemove', updateSelection ).on( 'mouseup', finishSelection );

               function updateSelection( event ) {
                  var dx = event.pageX - referenceX;
                  var dy = event.pageY - referenceY;
                  selection.style.width = Math.abs( dx ) + 'px';
                  selection.style.height = Math.abs( dy ) + 'px';
                  selection.style.left = ( dx < 0 ? fromX + dx : fromX ) + 'px';
                  selection.style.top = ( dy < 0 ? fromY + dy : fromY ) + 'px';

                  var selectionBox = visual.boundingBox( jqSelection, jqGraph, {} );
                  [ 'vertex', 'edge' ].forEach( function( nodeType ) {
                     var viewModel = view.selection[ nodeType === 'vertex' ? 'vertices' : 'edges' ];
                     var identity = nodeType === 'vertex' ? 'nbeVertex' : 'nbeEdge';
                     var tmpBox = {};
                     $( '.' + nodeType, jqGraph[ 0 ] ).each( function( i, domNode ) {
                        var jqNode = $( domNode );
                        visual.boundingBox( jqNode, jqGraph, tmpBox );
                        var selected = doesIntersect( tmpBox, selectionBox );
                        viewModel[ domNode.dataset[ identity ] ] = selected;
                        jqNode.toggleClass( 'selected', selected );
                     } );
                  } );
               }

               function finishSelection() {
                  $scope.$apply( function() {
                     $document.off( 'mousemove', updateSelection ).off( 'mouseup', finishSelection );
                     jqSelection.hide();
                  } );
               }

               function doesIntersect( box, selectionBox ) {
                  return !(
                     selectionBox.bottom < box.top || selectionBox.top > box.bottom ||
                     selectionBox.right < box.left || selectionBox.left > box.right
                     );
               }
            } );

            return {
               selectVertex: selectVertex,
               selectEdge: selectEdge,
               handleDelete: handleDelete
            };

         } )();

      }

   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   return {
      define: function( module ) {
         module.directive( DIRECTIVE_NAME, [
            '$timeout', '$document', 'nbeLayoutSettings', 'nbeAsync', 'nbeAutoLayout', 'nbeIdGenerator',
            createGraphDirective
         ] );
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