define( [
   'jquery',
   'underscore',
   'angular',
   '../utilities/visual',
   '../utilities/operations',
   'text!./graph.html'
], function( $, _, ng, visual, operationsModule, graphHtml ) {
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
         controller: [ '$scope', '$element', GraphController ]
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
         var generateLinkId;
         var generateEdgeId;

         var self = $scope.nbeController = this;
         self.dragDrop = dragDropController();
         self.selection = selectionController();
         self.links = linksController();
         self.zoom = zoomController();


         /** Provide access to the jQuery handle to the graph canvas element */
         var jqGraph = this.jqGraph = $( $element[ 0 ] );

         // Controller API:
         self.makeConnectOp = makeConnectOp;
         self.makeDisconnectOp = makeDisconnectOp;

         // Manage layout and rendering:
         self.calculateLayout = calculateLayout;
         self.adjustCanvasSize = adjustCanvasSize;


         var ops = this.operations = operationsModule.create( $scope );

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         function connected( port ) {
            return !!port.edgeId;
         }

         function updateTypes( newTypes ) {
            Object.keys( newTypes ).forEach( function( type ) {
               var hideType = !!( newTypes[ type ] && newTypes[ type ].hidden );
               jqGraph.toggleClass( 'hide-' + type, hideType );
            } );
            repaint();
            adjustCanvasSize();
         }

         function updateVertices( newVertices, previousVertices ) {
            if( newVertices == null ) {
               return;
            }

            var outputRefsByEdge = { };
            var inputRefsByEdge = { };
            ng.forEach( newVertices, function( vertex, vId ) {
               vertex.ports.filter( connected ).forEach( function( port ) {
                  var table = port.direction === 'in' ? inputRefsByEdge : outputRefsByEdge;
                  table[ port.edgeId ] = table[ port.edgeId ] || [];
                  table[ port.edgeId ].push( { nodeId: vId, port: port } );
               } );
            } );

            ng.forEach( newVertices, function( vertex, vId ) {
               if( !previousVertices[ vId ] ) {
                  $timeout( function() {
                     var jqNew = $( '[data-nbe-vertex="' + vId + '"]' );
                     visual.pingAnimation( jqNew );
                  } );
               }
               vertex.ports.filter( connected ).forEach( function( port ) {
                  var contextRef = { nodeId: vId, port: port };
                  if( !self.links.byPort( vId, port ).length ) {
                     if( $scope.types[ port.type ].simple ) {
                        var isInput = port.direction === 'in';
                        var table = isInput ? outputRefsByEdge : inputRefsByEdge;
                        ( table[ port.edgeId ] || [] ).forEach( function ( ref ) {
                           self.links.create( isInput ? ref : contextRef, isInput ? contextRef : ref );
                        } );
                     }
                     else {
                        var edgeRef = { nodeId: port.edgeId, port: null };
                        self.links.create( contextRef, edgeRef );
                     }
                  }
               } );
            } );
         }

         function updateEdges( newEdges, previousEdges ) {
            if( newEdges == null ) {
               return;
            }
            ng.forEach( newEdges, function( vertex, vId ) {
               if( !previousEdges[ vId ] ) {
                  $timeout( function() {
                     var jqNew = $( '[data-nbe-edge="' + vId + '"]' );
                     visual.pingAnimation( jqNew );
                  } );
               }
            } );
         }

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         $scope.$watch( 'types', updateTypes, true );
         $scope.$watch( 'model.vertices', updateVertices, true );
         $scope.$watch( 'model.edges', updateEdges, true );

         /////////////////////////////////////////////////////////////////////////////////////////////////////

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
            self.links.repaint();
         }

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         function initGraph( $scope ) {
            model = $scope.model;
            types = $scope.types || {};
            layout = $scope.layout;
            if( !layout ) {
               self.calculateLayout();
            }
            view = $scope.view = {
               selection: {
                  vertices: {},
                  edges: {},
                  links: {}
               },
               links: {},
               zoom: {
                  factor: 1,
                  percent: 100,
                  levels: [ 10, 25, 50, 75, 100 ],
                  level: 3
               }
            };

            generateEdgeId = idGenerator.create(
               Object.keys( types ).map( function( _ ) {
                  return _.toLocaleLowerCase() + ' ';
               } ),
               model.edges
            );
            generateLinkId = idGenerator.create( [ 'lnk' ], {} );

            jqGraph[ 0 ].addEventListener( 'mousedown', self.selection.start );
            $document.on( 'keydown', handleKeys );
            repaint();
            $scope.$watch( 'layout', async.ensure( adjustCanvasSize, 50 ), true );
         }

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         function handleKeys( event ) {
            var KEY_CODE_DELETE = 46, KEY_CODE_Y = 89, KEY_CODE_Z = 90, KEY_CODE_ESCAPE = 0x1B;

            if( event.keyCode === KEY_CODE_DELETE ) {
               self.selection.handleDelete();
            }
            else if( event.keyCode === KEY_CODE_ESCAPE ) {
               if( self.dragDrop.transaction() ) {
                  self.dragDrop.cancel();
               }
            }
            else if( event.metaKey || event.ctrlKey ) {
               if( event.keyCode === KEY_CODE_Z ) {
                  if( event.shiftKey ) {
                     ops.redo();
                  }
                  else {
                     ops.undo();
                  }
               }
               else if( event.keyCode === KEY_CODE_Y ) {
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
               if( type !== model.edges[ toEdgeId ].type ) {
                  return operationsModule.noOp;
               }

               var enforceCardinalityOp = makeEnforceCardinalityOp( toEdgeId, type, vertexRef.port.direction );
               var edgeRef = { nodeId: toEdgeId };

               var connectPortToEdgeOp = function() {
                  vertexRef.port.edgeId = toEdgeId;
                  var link = self.links.create( vertexRef, edgeRef );
                  connectPortToEdgeOp.undo = makeCutOp( link );
               };

               return operationsModule.compose( [ enforceCardinalityOp, connectPortToEdgeOp ] );
            }

            //////////////////////////////////////////////////////////////////////////////////////////////////

            /** If mandated by the edge type, delete one link to this edge (allowing to form a new link). */
            function makeEnforceCardinalityOp( edgeId, type, portDirection ) {
               var restrictDests = portDirection === 'in';
               var limit = types[ type ] && types[ type ][ restrictDests ? 'maxDestinations' : 'maxSources' ];
               if( limit === undefined ) {
                  return operationsModule.noOp;
               }

               var disconnectOps = [];
               var counter = 0;
               var links = self.links.byEdge( edgeId );
               Object.keys( links ).forEach( function( linkId ) {
                  var link = links[ linkId ];
                  if( link[ restrictDests ? 'source' : 'dest' ].nodeId === edgeId ) {
                     ++counter;
                     if( counter >= limit ) {
                        disconnectOps.push( makeDisconnectOp( link[ restrictDests ? 'dest' : 'source' ] ) );
                     }
                  }
               } );
               return operationsModule.compose( disconnectOps );
            }

            //////////////////////////////////////////////////////////////////////////////////////////////////

            function makeConnectPortToPortOp( fromRef, toRef ) {
               if( fromRef.port.type !== toRef.port.type ||
                  fromRef.port.direction === toRef.port.direction ) {
                  return operationsModule.noOp;
               }

               var ops = [];
               [ fromRef, toRef ].forEach( function( ref ) {
                  var isDest = isInput( ref.port );
                  var typeDef = $scope.types[ ref.port.type ];
                  if( !( typeDef.simple && 1 === (isDest ? typeDef.maxDestinations : typeDef.maxSources) ) ) {
                     ops.push( makeDisconnectOp( ref ) );
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
                     var link = self.links.create( fromRef, toRef );
                     fromRef.port.edgeId = edgeId;
                     toRef.port.edgeId = edgeId;
                     connectPortToPortOp.undo = makeCutOp( link );
                  }

                  $timeout( function() {
                     visual.pingAnimation( $( '[data-nbe-edge="' + edgeId + '"]' ) );
                  } );
               }

               ops.push( connectPortToPortOp );
               return operationsModule.compose( ops );
            }
         }

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         function makeCutOp( link ) {
            var edgeId = ( link.source.port || link.dest.port ).edgeId;
            var edge = model.edges[ edgeId ];

            var cutLink = function() {
               self.links.destroy( link );
               [ link.source, link.dest ].forEach( function( ref ) {
                  var port = ref.port;
                  if( port && self.links.byPort( ref.nodeId, port ).length === 0 ) {
                     port.edgeId = null;
                  }
               } );
               var remaining = Object.keys( self.links.byEdge( edgeId ) );
               if( remaining.length === 0 ) {
                  delete model.edges[ edgeId ];
                  cutLink.undo = operationsModule.compose( [
                     function() { model.edges[ edgeId ] = edge; }, cutLink.undo
                  ] );
               }
            };
            cutLink.undo = function() {
               [ link.source, link.dest ].forEach( function( ref ) {
                  if( ref.port ) {
                     ref.port.edgeId = edgeId;
                  }
               } );
               self.links.create( link.source, link.dest );
            };
            return cutLink;
         }

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         function makeDisconnectOp( ref ) {
            Object.freeze( ref );
            var portLinks = self.links.byPort( ref.nodeId, ref.port );
            if( portLinks.length === 0 ) {
               return operationsModule.noOp;
            }
            return operationsModule.compose( portLinks.map( function( link ) {
               return makeCutOp( link );
            } ) );
         }

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         function makeDeleteEdgeOp( edgeId ) {
            var links = self.links.byEdge( edgeId );
            var linkIds = Object.keys( links );
            return operationsModule.compose( linkIds.map( function( linkId ) {
               return makeCutOp( links[ linkId ] );
            } ) );
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

         function centerCoords( vertexId ) {
            var vertexLayout = layout.vertices[ vertexId ];
            var jqVertex = $( '[data-nbe-vertex=' + vertexId + ']', jqGraph );
            return [ vertexLayout.left + jqVertex.width() / 2, vertexLayout.top + jqVertex.height() / 2 ];
         }

         function mean( v1, v2 ) {
            return [ 0, 1 ].map( function ( i ) {
               return Math.round( (v1[ i ] + v2[ i ]) / 2 );
            } );
         }

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

            if( $scope.types[ type ].simple ) {
               self.links.create( fromRef, toRef );
            }
            else {
               var edgeCenter = mean( centerCoords( fromRef.nodeId ), centerCoords( toRef.nodeId ) );
               layout.edges[ id ] = {
                  left: edgeCenter[ 0 ] - layoutSettings.edgeOffset,
                  top: edgeCenter[ 1 ] - layoutSettings.edgeOffset
               };
               self.links.create( fromRef, edgeRef );
               self.links.create( edgeRef, toRef );
            }

            return id;
         }

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         function calculateLayout() {
            async.runEventually( function() {
               var input = $scope.model;
               if( !self.selection.isEmpty() ) {
                  var sel = $scope.view.selection;
                  input = { edges: {}, vertices: {} };
                  Object.keys( sel.edges ).forEach( function( edgeId ) {
                     input.edges[ edgeId ] = $scope.model.edges[ edgeId ];
                  } );
                  Object.keys( sel.vertices ).forEach( function( vertexId ) {
                     input.vertices[ vertexId ] = $scope.model.vertices[ vertexId ];
                  } );
               }

               var result = autoLayout.calculate( input, $scope.types, jqGraph, $scope.view.zoom.factor );
               if( result ) {
                  Object.keys( result.edges ).forEach( function( edgeId ) {
                     layout.edges[ edgeId ] = result.edges[ edgeId ];
                  } );
                  Object.keys( result.vertices ).forEach( function( vertexId ) {
                     layout.vertices[ vertexId ] = result.vertices[ vertexId ];
                  } );
                  $timeout( repaint );
                  $timeout( adjustCanvasSize );
               }
               return !!result;
            }, $scope, 1500 );
         }

         /////////////////////////////////////////////////////////////////////////////////////////////////////
         /////////////////////////////////////////////////////////////////////////////////////////////////////

         /** Manages the view model for links. */
         function linksController() {

            var linksByEdge = {};
            var linksByVertex = {};
            var linkControllers = {};

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
               if( isSimple( link ) ) {
                  var edgeId = fromRef.port.edgeId;
                  insert( { nodeId: edgeId }, link.id, link );
               }
               view.links[ link.id ] = link;
               return link;

               //////////////////////////////////////////////////////////////////////////////////////////////////

               function insert( ref, linkId, link ) {
                  var map = ref.port ? linksByVertex : linksByEdge;
                  if( !map[ ref.nodeId ] ) {
                     map[ ref.nodeId ] = { };
                  }
                  map[ ref.nodeId ][ linkId ] = link;
               }

            }

            /////////////////////////////////////////////////////////////////////////////////////////////////////

            function destroyLink( link ) {
               function remove( map, nodeId, linkId ) {
                  delete map[ nodeId ][ linkId ];
               }

               remove( link.source.port ? linksByVertex : linksByEdge, link.source.nodeId, link.id );
               remove( link.dest.port ? linksByVertex : linksByEdge, link.dest.nodeId, link.id );
               delete view.links[ link.id ];
            }

            /////////////////////////////////////////////////////////////////////////////////////////////////////

            function controllers( vertexIds, edgeIds ) {
               var result = [];
               ( vertexIds || [] ).forEach( function( vertexId ) {
                  vertexLinkControllers( vertexId ).forEach( function( ctr ) {
                     result.push( ctr );
                  } );
               } );
               ( edgeIds || [] ).forEach( function( edgeId ) {
                  edgeLinkControllers( edgeId ).forEach( function( ctr ) {
                     result.push( ctr );
                  } );
               } );
               return result;
            }

            /////////////////////////////////////////////////////////////////////////////////////////////////////

            function vertexLinkControllers( vertexId ) {
               if( linksByVertex[ vertexId ] === undefined ) {
                  return [];
               }
               return Object.keys( linksByVertex[ vertexId ] ).map( function( linkId ) {
                  return linkControllers[ linkId ];
               } );
            }

            /////////////////////////////////////////////////////////////////////////////////////////////////////

            function edgeLinkControllers( edgeId ) {
               if( linksByEdge[ edgeId ] === undefined ) {
                  return [];
               }
               return Object.keys( linksByEdge[ edgeId ] ).map( function( linkId ) {
                  return linkControllers[ linkId ];
               } );
            }

            /////////////////////////////////////////////////////////////////////////////////////////////////////

            function byPort( vertexId, port ) {
               var portId = port.id;
               if( !linksByVertex[ vertexId ] ) {
                  linksByVertex[ vertexId ] = {};
               }
               var candidates = linksByVertex[ vertexId ];
               var links = [];
               var keys = Object.keys( candidates );
               for( var i = keys.length; i --> 0; ) {
                  var linkId = keys[ i ];
                  var link = candidates[ linkId ];
                  if( link.source.nodeId === vertexId && link.source.port.id === portId ) {
                     links.push( link );
                  }
                  if( link.dest.nodeId === vertexId && link.dest.port.id === portId ) {
                     links.push( link );
                  }
               }
               return links;
            }

            return {
               create: createLink,
               destroy: destroyLink,
               byPort: byPort,
               byVertex: function( vertexId ) {
                  if( !linksByVertex[ vertexId ] ) {
                     linksByVertex[ vertexId ] = {};
                  }
                  return linksByVertex[ vertexId ];
               },
               byEdge: function( edgeId ) {
                  if( !linksByEdge[ edgeId ] ) {
                     linksByEdge[ edgeId ] = {};
                  }
                  return linksByEdge[ edgeId ];
               },
               repaint: function() {
                  ng.forEach( linkControllers, function( controller ) {
                     controller.repaint();
                  } );
               },
               registerController: function( linkId, linkController ) {
                  linkControllers[ linkId ] = linkController;
               },
               controllers: controllers,
               controllersById: function() {
                  return linkControllers;
               }
            };

         }

         /////////////////////////////////////////////////////////////////////////////////////////////////////
         /////////////////////////////////////////////////////////////////////////////////////////////////////

         /** Manages drag/drop of ports to create links or even new edges. */
         function dragDropController() {

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
                  if( transaction ) {
                     transaction.commit();
                     clear();
                  }
               },

               cancel: function() {
                  if( transaction ) {
                     transaction.rollBack();
                     clear();
                     onCancel();
                  }
               }
            } );
         }

         /////////////////////////////////////////////////////////////////////////////////////////////////////
         /////////////////////////////////////////////////////////////////////////////////////////////////////

         /** Manages the view model for selection of nodes. */
         function selectionController() {

            var anchor;

            function handleDelete() {
               var operations = [];
               Object.keys( view.selection.edges ).forEach( function( eId ) {
                  operations.push( makeDeleteEdgeOp( eId ) );
               } );
               Object.keys( view.selection.vertices ).forEach( function( vId ) {
                  operations.push( makeDeleteVertexOp( vId ) );
               } );
               clear();
               ops.perform( operationsModule.compose( operations ) );
               $scope.$digest();
            }

            //////////////////////////////////////////////////////////////////////////////////////////////////

            function isEmpty() {
               return !Object.keys( view.selection.vertices ).length && !Object.keys( view.selection.edges ).length;
            }

            //////////////////////////////////////////////////////////////////////////////////////////////////

            function clear() {
               view.selection = { vertices: {}, edges: {}, links: {} };
            }

            //////////////////////////////////////////////////////////////////////////////////////////////////

            function selectEdge( edgeId, extend ) {
               if( !extend ) {
                  clear();
               }
               var selected = view.selection.edges[ edgeId ];
               view.selection.edges[ edgeId ] = !selected;
               updateLinks();
            }

            //////////////////////////////////////////////////////////////////////////////////////////////////

            function selectVertex( vertexId, extend ) {
               if( !extend ) {
                  clear();
               }
               var selected = view.selection.vertices[ vertexId ];
               view.selection.vertices[ vertexId ] = !selected;
               updateLinks();
            }

            /////////////////////////////////////////////////////////////////////////////////////////////////////

            function start( event ) {
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
               $document.on( 'mousemove', updateSelection ).on( 'mouseup', finish );

               function updateSelection( event ) {
                  var dx = event.pageX - referenceX;
                  var dy = event.pageY - referenceY;
                  selection.style.width = Math.abs( dx ) + 'px';
                  selection.style.height = Math.abs( dy ) + 'px';
                  selection.style.left = ( dx < 0 ? fromX + dx : fromX ) + 'px';
                  selection.style.top = ( dy < 0 ? fromY + dy : fromY ) + 'px';

                  var selectionBox = visual.boundingBox( jqSelection, jqGraph, {} );
                  [ 'vertex', 'edge' ].forEach( function( nodeType ) {
                     var selectionModel = view.selection[ nodeType === 'vertex' ? 'vertices' : 'edges' ];
                     var identity = nodeType === 'vertex' ? 'nbeVertex' : 'nbeEdge';
                     var tmpBox = {};
                     $( '.' + nodeType, jqGraph[ 0 ] ).each( function( _, domNode ) {
                        var jqNode = $( domNode );
                        visual.boundingBox( jqNode, jqGraph, tmpBox );
                        var selected = doesIntersect( tmpBox, selectionBox );
                        var id = domNode.dataset[ identity ];
                        if( selected ) {
                           selectionModel[ id ] = true;
                        }
                        else {
                           delete selectionModel[ id ];
                        }
                        jqNode.toggleClass( 'selected', selected );
                     } );
                  } );

                  updateLinks();
               }

               function finish() {
                  $scope.$apply( function() {
                     $document.off( 'mousemove', updateSelection ).off( 'mouseup', finish );
                     jqSelection.hide();
                  } );
               }

               function doesIntersect( box, selectionBox ) {
                  return !(
                     selectionBox.bottom < box.top || selectionBox.top > box.bottom ||
                     selectionBox.right < box.left || selectionBox.left > box.right
                     );
               }
            }

            //////////////////////////////////////////////////////////////////////////////////////////////////

            function setAnchor( domNode ) {
               var pos = $( domNode ).position();
               var followers = $( '.selected:not(.ui-draggable-dragging):not(.link)', jqGraph[ 0 ] );
               anchor = {
                  domNode: domNode,
                  left: pos.left,
                  top: pos.top,
                  followers: followers
               };
            }

            //////////////////////////////////////////////////////////////////////////////////////////////////

            function followAnchor() {
               if( !anchor ) {
                  return;
               }
               var zoomFactor = view.zoom.factor;
               var newPos = $( anchor.domNode ).position();
               var dx = newPos.left - anchor.left;
               var dy = newPos.top - anchor.top;
               anchor.followers.each( function( _, domNode ) {
                  var nodeLayout = domNode.dataset.nbeVertex ?
                     $scope.layout.vertices[ domNode.dataset.nbeVertex ] :
                     $scope.layout.edges[ domNode.dataset.nbeEdge ];
                  domNode.style.left = nodeLayout.left*zoomFactor + dx + 'px';
                  domNode.style.top = nodeLayout.top*zoomFactor + dy + 'px';
               } );
               self.links.repaint();
            }

            //////////////////////////////////////////////////////////////////////////////////////////////////

            function clearAnchor() {
               var zoomFactor = view.zoom.factor;
               anchor.followers.each( function( _, domNode ) {
                  var nodeLayout = domNode.dataset.nbeVertex ?
                     $scope.layout.vertices[ domNode.dataset.nbeVertex ] :
                     $scope.layout.edges[ domNode.dataset.nbeEdge ];
                  nodeLayout.left = parseInt( domNode.style.left, 10 )/zoomFactor;
                  nodeLayout.top = parseInt( domNode.style.top, 10 )/zoomFactor;
               } );
               anchor = null;
            }

            //////////////////////////////////////////////////////////////////////////////////////////////////

            function updateLinks() {
               var linksState = { };
               Object.keys( model.edges ).forEach( function( edgeId ) {
                  var edgeState = view.selection.edges[ edgeId ];
                  Object.keys( self.links.byEdge( edgeId ) ).forEach( function( linkId ) {
                     linksState[ linkId ] = edgeState || linksState[ linkId ];
                  } );
               } );

               Object.keys( model.vertices ).forEach( function( vertexId ) {
                  var vertexState = view.selection.vertices[ vertexId ];
                  Object.keys( self.links.byVertex( vertexId ) ).forEach( function( linkId ) {
                     linksState[ linkId ] = vertexState || linksState[ linkId ];
                  } );
               } );

               var linkControllers = self.links.controllersById();
               Object.keys( linkControllers ).forEach( function( linkId ) {
                  linkControllers[ linkId ].toggleSelect( linksState[ linkId ] || false );
               } );
               view.selection.links = linksState;
            }

            //////////////////////////////////////////////////////////////////////////////////////////////////



            return {
               isEmpty: isEmpty,
               selectVertex: selectVertex,
               selectEdge: selectEdge,
               setAnchor: setAnchor,
               followAnchor: followAnchor,
               clearAnchor: clearAnchor,
               start: start,
               handleDelete: handleDelete,
               clear: clear
            };

         }

         /////////////////////////////////////////////////////////////////////////////////////////////////////
         /////////////////////////////////////////////////////////////////////////////////////////////////////

         function zoomController() {

            function apply( level ) {
               var z = view.zoom;
               z.percent = z.levels[ level ];
               z.factor = z.percent/100;
               $timeout( self.links.repaint, 0 );
            }

            return {
               zoomOut: function() {
                  var z = view.zoom;
                  if( z.level > 0 ) {
                     apply( --z.level );
                  }
               },
               zoomIn: function() {
                  var z = view.zoom;
                  if( z.level < z.levels.length - 1 ) {
                     apply( ++z.level );
                  }
               }
            };
         }

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         function isInput( port ) {
            return port && port.direction === 'in';
         }

         function isOutput( port ) {
            return port && port.direction !== 'in';
         }

         function isSimple( typed ) {
            return !!$scope.types[ typed.type ].simple;
         }

         /////////////////////////////////////////////////////////////////////////////////////////////////////

      }

   }

   /*
   function fmtR( ref ) {
      return '[' + ref.nodeId + ':' + ( ref.port || {id:'*'} ).id + ']';
   }

   function fmtL( link ) {
      var edgeId = ( link.source.port || link.dest.port ).edgeId;
      return link.id + ':' + fmtR( link.source ) + '--(' + edgeId +')-->' + fmtR( link.dest );
   }
   */

   return {
      define: function( module ) {

         module.directive( DIRECTIVE_NAME, [
            '$timeout', '$document', 'nbeLayoutSettings', 'nbeAsync', 'nbeAutoLayout', 'nbeIdGenerator',
            createGraphDirective
         ] );
         module.filter( 'nbeInputPorts', function() {
            return function( ports ) {
               return ports.filter( function( _ ) {
                  return _.direction === 'in';
               } );
            };
         } );
         module.filter( 'nbeOutputPorts', function() {
            return function( ports ) {
               return ports.filter( function( _ ) {
                  return _.direction !== 'in';
               } );
            };
         } );
      }
   };

} );