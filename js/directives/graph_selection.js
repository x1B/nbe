/** Manages the view model for a selection of nodes. */
define( [ 'angular' ], function( ng ) {
   'use strict';

   /**
    * @param {Object} view
    *    the graph view model
    * @param {Object} graphOperations
    *    the graph operations controller, to apply selection operations to the graph
    */
   return function graphSelectionController( view, graphOperations ) {

      var anchor;

      function handleDelete() {
         var operations = [];
         Object.keys( view.selection.edges ).forEach( function ( eId ) {
            operations.push( makeDeleteEdgeOp( eId ) );
         } );
         Object.keys( view.selection.vertices ).forEach( function ( vId ) {
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
         if ( !extend ) {
            clear();
         }
         var selected = view.selection.edges[ edgeId ];
         view.selection.edges[ edgeId ] = !selected;
         updateLinks();
      }

      //////////////////////////////////////////////////////////////////////////////////////////////////

      function selectVertex( vertexId, extend ) {
         if ( !extend ) {
            clear();
         }
         var selected = view.selection.vertices[ vertexId ];
         view.selection.vertices[ vertexId ] = !selected;
         updateLinks();
      }

      /////////////////////////////////////////////////////////////////////////////////////////////////////

      function start( event ) {
         if ( event.target !== jqGraph[ 0 ] && event.target.nodeName !== 'svg' ) {
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
            [ 'vertex', 'edge' ].forEach( function ( nodeType ) {
               var selectionModel = view.selection[ nodeType === 'vertex' ? 'vertices' : 'edges' ];
               var identity = nodeType === 'vertex' ? 'nbeVertex' : 'nbeEdge';
               var tmpBox = {};
               $( '.' + nodeType, jqGraph[ 0 ] ).each( function ( _, domNode ) {
                  var jqNode = $( domNode );
                  visual.boundingBox( jqNode, jqGraph, tmpBox );
                  var selected = doesIntersect( tmpBox, selectionBox );
                  var id = domNode.dataset[ identity ];
                  if ( selected ) {
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
            $scope.$apply( function () {
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
         if ( !anchor ) {
            return;
         }
         var zoomFactor = view.zoom.factor;
         var newPos = $( anchor.domNode ).position();
         var dx = newPos.left - anchor.left;
         var dy = newPos.top - anchor.top;
         anchor.followers.each( function ( _, domNode ) {
            var nodeLayout = domNode.dataset.nbeVertex ?
               $scope.layout.vertices[ domNode.dataset.nbeVertex ] :
               $scope.layout.edges[ domNode.dataset.nbeEdge ];
            domNode.style.left = nodeLayout.left * zoomFactor + dx + 'px';
            domNode.style.top = nodeLayout.top * zoomFactor + dy + 'px';
         } );
         self.links.repaint();
      }

      //////////////////////////////////////////////////////////////////////////////////////////////////

      function clearAnchor() {
         var zoomFactor = view.zoom.factor;
         anchor.followers.each( function ( _, domNode ) {
            var nodeLayout = domNode.dataset.nbeVertex ?
               $scope.layout.vertices[ domNode.dataset.nbeVertex ] :
               $scope.layout.edges[ domNode.dataset.nbeEdge ];
            nodeLayout.left = parseInt( domNode.style.left, 10 ) / zoomFactor;
            nodeLayout.top = parseInt( domNode.style.top, 10 ) / zoomFactor;
         } );
         anchor = null;
      }

      //////////////////////////////////////////////////////////////////////////////////////////////////

      function updateLinks() {
         var linksState = { };
         Object.keys( model.edges ).forEach( function ( edgeId ) {
            var edgeState = view.selection.edges[ edgeId ];
            Object.keys( self.links.byEdge( edgeId ) ).forEach( function ( linkId ) {
               linksState[ linkId ] = edgeState || linksState[ linkId ];
            } );
         } );

         Object.keys( model.vertices ).forEach( function ( vertexId ) {
            var vertexState = view.selection.vertices[ vertexId ];
            Object.keys( self.links.byVertex( vertexId ) ).forEach( function ( linkId ) {
               linksState[ linkId ] = vertexState || linksState[ linkId ];
            } );
         } );

         var linkControllers = self.links.controllersById();
         Object.keys( linkControllers ).forEach( function ( linkId ) {
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

   };

} );
