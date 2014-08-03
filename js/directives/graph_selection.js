/**
 * Manages the view model for a selection of nodes.
 */
define( [ 'jquery', '../utilities/visual' ], function( $, visual ) {
   'use strict';

   /**
    * @param {Object} model
    *    the graph model (edges, vertices)
    * @param {Object} viewModel
    *    the graph view model (zoom, selection)
    * @param {Object} layoutModel
    *    the graph layout model (positions of edges, vertices)
    */
   return function( model, viewModel, layoutModel, linksController, jqGraph, $document, $scope ) {

      var selection = viewModel.selection;
      var anchor;

      jqGraph[ 0 ].addEventListener( 'mousedown', start );

      return {
         setAnchor: setAnchor,
         followAnchor: followAnchor,
         start: start,
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
         }
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

      function selectEdge( edgeId, extend ) {
         if( !extend ) {
            clear();
         }
         var selected = selection.edges[ edgeId ];
         selection.edges[ edgeId ] = !selected;
         updateLinks();
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function selectVertex( vertexId, extend ) {
         if( !extend ) {
            clear();
         }
         var selected = selection.vertices[ vertexId ];
         selection.vertices[ vertexId ] = !selected;
         console.log( vertexId, selection.vertices[ vertexId ] );
         updateLinks();
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function start( event ) {
         if( event.target !== jqGraph[ 0 ] && event.target.nodeName !== 'svg' ) {
            return;
         }

         $document.on( 'mousemove', updateSelection ).on( 'mouseup', finish );

         var jqSelection = $( '.selection', jqGraph );
         var domSelection = jqSelection[ 0 ];
         var referenceX = event.pageX;
         var referenceY = event.pageY;
         var fromX = event.offsetX || event.layerX;
         var fromY = event.offsetY || event.layerY;
         updateSelection( event );
         jqSelection.show();

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         function updateSelection( event ) {
            var dx = event.pageX - referenceX;
            var dy = event.pageY - referenceY;
            domSelection.style.width = Math.abs( dx ) + 'px';
            domSelection.style.height = Math.abs( dy ) + 'px';
            domSelection.style.left = ( dx < 0 ? fromX + dx : fromX ) + 'px';
            domSelection.style.top = ( dy < 0 ? fromY + dy : fromY ) + 'px';

            var selectionBox = visual.boundingBox( jqSelection, jqGraph, {} );
            [ 'vertex', 'edge' ].forEach( function( nodeType ) {
               var selectionState = selection[ nodeType === 'vertex' ? 'vertices' : 'edges' ];
               var identity = nodeType === 'vertex' ? 'nbeVertex' : 'nbeEdge';
               var tmpBox = {};
               $( '.' + nodeType, jqGraph[ 0 ] ).each( function( _, domNode ) {
                  var jqNode = $( domNode );
                  visual.boundingBox( jqNode, jqGraph, tmpBox );
                  var selected = doesIntersect( tmpBox, selectionBox );
                  var id = domNode.dataset[ identity ];
                  if( selected ) {
                     selectionState[ id ] = true;
                  }
                  else {
                     delete selectionState[ id ];
                  }
               } );
            } );

            updateLinks();
            // :TODO: debounce
            $scope.$apply();
         }

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         function finish() {
            $document.off( 'mousemove', updateSelection ).off( 'mouseup', finish );
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
         var followers = $( '.selected:not(.ui-draggable-dragging):not(.link)', jqGraph[ 0 ] );
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
         linksController.repaint();
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

      function updateLinks() {
         var linksState = { };
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
