/**
 * Manages the view model for a selection of nodes.
 */
define( [ 'angular', 'jquery', '../utilities/visual', '../utilities/traverse' ],
   function( ng, $, visual, traverse ) {
   'use strict';

   var VERTICES = 'vertices';
   var EDGES = 'edges';

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   /**
    * Create a selection controller for a given graph.
    *
    * There can be up to one selection controller per graph, which may represent an empty selection.
    * A user can modify the selection by (shift)-clicking nodes (vertices and hyperedges), or by dragging a
    * rectangle covering such elements.
    *
    * Edge nodes within the graph model are part of the selection if either
    * - their representation node is part of the selection (hyperedges), or
    * - they are 1:n edges and their source node is part of the selection, or
    * - they are n:1 edges and their destination node is part of the selection
    *
    * @param {Object} model
    *    the graph model (edges, vertices)
    * @param {Object} viewModel
    *    the graph view model (zoom, selection)
    * @param {Object} layoutModel
    *    the graph layout model (positions of edges, vertices)
    */
   return function( model, viewModel, layoutModel, edgeTypes, linksController, jqGraph, canvasController, $document, $scope ) {

      var selection = viewModel.selection;
      var anchor;

      var svgBackground = $( 'svg', jqGraph )[0];
      var canvas = $( '.nbe-graph-canvas', jqGraph )[0];
      $document.on( 'mousedown', function( event ) {
         viewModel.hasFocus = jqGraph.is( ':hover' );
         if( viewModel.hasFocus ) {
            jqGraph.focus();
         }
         if( viewModel.hasFocus && (event.target === svgBackground || event.target === canvas) ) {
            start( event );
         }
      } );

      return {
         setAnchor: setAnchor,
         followAnchor: followAnchor,
         isEmpty: isEmpty,
         selectVertex: selectVertex,
         selectEdge: selectEdge,
         clearAnchor: clearAnchor,
         clear: clear,
         edges: function() {
            return selection.edges;
         },
         vertices: function() {
            return selection.vertices;
         },
         copy: copy
      };

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function isEmpty() {
         return !Object.keys( selection.vertices ).length && !Object.keys( selection.edges ).length;
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function clear() {
         viewModel.selection = selection = { vertices: {}, edges: {}, links: {} };
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      /**
       * Create a graph that contains all nodes that are part of the current selection (except fixed nodes).
       * Ports that are connected will only be connected in the copy if their edges are part of the selection.
       */
      function copy() {
         var subGraph = { vertices: {}, edges: {} };
         var subLayout = { vertices: {}, edges: {} };
         [ EDGES, VERTICES ].forEach( function( collection ) {
            var graphSource = model[ collection ];
            var graphDest = subGraph[ collection ];
            var layoutSource = layoutModel[ collection ];
            var layoutDest = subLayout[ collection ];
            Object.keys( selection[ collection ] ).forEach( function( id ) {
               if( layoutSource[ id ] ) {
                  layoutDest[ id ] = { left: layoutSource[ id ].left, top: layoutSource[ id ].top };
               }
               graphDest[ id ] = ng.copy( graphSource[ id ] );
               if( collection === VERTICES ) {
                  traverse.eachPort( graphDest[ id ], function( port ) {
                     if( !selection.edges[ port.edgeId ] ) {
                        port.edgeId = null;
                     }
                  } );
               }
            } );
         } );
         return {
            graph: subGraph,
            layout: subLayout
         };
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function selectEdge( edgeId, extend ) {
         if( !extend ) {
            clear();
         }
         var selected = selection.edges[ edgeId ];
         selection.edges[ edgeId ] = !selected;
         updateImplicitEdges();
         updateLinks();
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function selectVertex( vertexId, extend ) {
         if( !extend ) {
            clear();
         }
         var selected = selection.vertices[ vertexId ];
         selection.vertices[ vertexId ] = !selected;
         updateImplicitEdges();
         updateLinks();
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function start( startEvent ) {
         $document.on( 'mousemove', updateSelectionCoords ).on( 'mouseup', finish );
         var finished = false;
         var visible = false;

         var updateHits = function() {
            window.requestAnimationFrame( updateSelectionContentsNow );
         };

         var jqSelection = $( '.nbe-selection', jqGraph );
         var selectionCoords = { width: '0', height: '0', left: '0', top: '0' };
         var referenceX = startEvent.pageX;
         var referenceY = startEvent.pageY;

         var rect = startEvent.target.getBoundingClientRect();
         var fromX = startEvent.clientX - rect.left;
         var fromY = startEvent.clientY - rect.top;

         updateSelectionCoords( startEvent );
         startEvent.preventDefault();

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         function updateSelectionCoords( event ) {
            var dx = event.pageX - referenceX;
            var dy = event.pageY - referenceY;

            selectionCoords.width = Math.abs( dx ) + 'px';
            selectionCoords.height = Math.abs( dy ) + 'px';
            selectionCoords.left = ( dx < 0 ? fromX + dx : fromX ) + 'px';
            selectionCoords.top = ( dy < 0 ? fromY + dy : fromY ) + 'px';
            updateHits();
            event.preventDefault();
            window.requestAnimationFrame( updateSelectionBox );
         }

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         function updateSelectionBox() {
            if( finished ) {
               return;
            }
            var domSelection = jqSelection[ 0 ];
            domSelection.style.width = selectionCoords.width;
            domSelection.style.height = selectionCoords.height;
            domSelection.style.left = selectionCoords.left;
            domSelection.style.top = selectionCoords.top;
            if( !visible ) {
               jqSelection.show();
               visible = true;
            }
         }

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         function updateSelectionContentsNow() {

            var selectionBox = visual.boundingBox( jqSelection, jqGraph, {} );
            var test = finished ? function() { return false; } : doesIntersect;

            var modificationDetected = false;
            [ VERTICES, EDGES ].forEach( function( collection ) {
               var selectionState = selection[ collection ];
               var identity = collection === VERTICES ? 'nbeVertex' : 'nbeEdge';
               var selector = collection === VERTICES ? '.nbe-vertex' : '.nbe-edge';
               var tmpBox = {};
               $( selector, jqGraph[ 0 ] ).each( function( _, domNode ) {
                  var jqNode = $( domNode );
                  visual.boundingBox( jqNode, jqGraph, tmpBox );
                  var selected = test( tmpBox, selectionBox );
                  var id = domNode.dataset[ identity ];
                  if( selected ) {
                     modificationDetected = modificationDetected || !selectionState[ id ];
                     selectionState[ id ] = true;
                  }
                  else {
                     modificationDetected = modificationDetected || ( id in selectionState );
                     delete selectionState[ id ];
                  }
               } );
            } );

            if( modificationDetected ) {
               updateImplicitEdges();
               updateLinks();
               $scope.$apply();
            }
         }

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         function finish() {
            finished = true;
            $document.off( 'mousemove', updateSelectionCoords ).off( 'mouseup', finish );
            jqSelection.hide();
         }

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         function doesIntersect( box, selectionBox ) {
            return !( selectionBox.bottom < box.top || selectionBox.top > box.bottom ||
                      selectionBox.right < box.left || selectionBox.left > box.right );
         }
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function setAnchor( domNode ) {
         var pos = $( domNode ).position();
         var followers = $( '.nbe-selected:not(.ui-draggable-dragging):not(.nbe-link)', jqGraph[ 0 ] );
         anchor = {
            domNode: domNode,
            left: pos.left,
            top: pos.top,
            followers: followers
         };
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function followAnchor() {
         if( !anchor ) {
            return;
         }
         var zoomFactor = viewModel.zoom.factor;
         var newPos = $( anchor.domNode ).position();
         var dx = newPos.left - anchor.left;
         var dy = newPos.top - anchor.top;
         anchor.followers.each( function( _, domNode ) {
            var nodeLayout = domNode.dataset.nbeVertex ?
               layoutModel.vertices[ domNode.dataset.nbeVertex ] :
               layoutModel.edges[ domNode.dataset.nbeEdge ];
            domNode.style.left = nodeLayout.left * zoomFactor + dx + 'px';
            domNode.style.top = nodeLayout.top * zoomFactor + dy + 'px';
         } );
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function clearAnchor() {
         var zoomFactor = viewModel.zoom.factor;
         anchor.followers.each( function( _, domNode ) {
            var nodeLayout = domNode.dataset.nbeVertex ?
               layoutModel.vertices[ domNode.dataset.nbeVertex ] :
               layoutModel.edges[ domNode.dataset.nbeEdge ];
            nodeLayout.left = parseInt( domNode.style.left, 10 ) / zoomFactor;
            nodeLayout.top = parseInt( domNode.style.top, 10 ) / zoomFactor;
         } );
         anchor = null;
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      /**
       * Make sure that the selection contains 1:n (n:1) edges if their source (dest) vertices are part of
       * the selection. These edges are called "implicitly selected".
       */
      function updateImplicitEdges() {
         // mark implicitly selected edges
         var implicitEdges = {};
         ng.forEach( selection.vertices, function( _, vertexId ) {
            var vertex = model.vertices[ vertexId ];
            traverse.eachPort( vertex, function( port, direction ) {
               if( !port.edgeId ) { return; }
               var type = edgeTypes[ port.type ];
               if( !type.simple ) { return; }
               var ownerRestriction = direction === 'outbound' ? 'maxSources' : 'maxDestinations';
               if( type[ ownerRestriction ] === 1 ) {
                  implicitEdges[ port.edgeId ] = true;
               }
            } );
         } );

         // sweep unmarked edges from selection
         ng.forEach( selection.edges, function( _, edgeId ) {
            if( implicitEdges[ edgeId ] ) { return; }
            var type = edgeTypes[ model.edges[ edgeId ].type ];
            if( type.simple === true ) {
               delete selection.edges[ edgeId ];
            }
         } );

         // apply implicit selection to selection state
         ng.forEach( implicitEdges, function( _, edgeId ) {
            selection.edges[ edgeId ] = true;
         } );
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function updateLinks() {
         var linksState = {};
         Object.keys( model.edges ).forEach( function( edgeId ) {
            var edgeState = selection.edges[ edgeId ];
            Object.keys( linksController.byEdge( edgeId ) ).forEach( function( linkId ) {
               linksState[ linkId ] = edgeState || linksState[ linkId ];
            } );
         } );

         Object.keys( model.vertices ).forEach( function( vertexId ) {
            var vertexState = selection.vertices[ vertexId ];
            Object.keys( linksController.byVertex( vertexId ) ).forEach( function( linkId ) {
               linksState[ linkId ] = vertexState || linksState[ linkId ];
            } );
         } );

         var linkControllers = linksController.controllersById();
         Object.keys( linkControllers ).forEach( function( linkId ) {
            linkControllers[ linkId ].toggleSelect( linksState[ linkId ] || false );
         } );
         selection.links = linksState;
      }

   };

} );
