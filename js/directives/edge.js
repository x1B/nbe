/**
 * An edge is a node which has no named ports, but can have 0..n input links and 0..n output links itself.
 *
 * It represents a multi-edge in a directed graph model, and may connect an arbitrary number of vertices.
 */
define( [
   'jquery',
   'angular',
   '../utilities/visual',
   'text!./edge.html',
   'jquery_ui/draggable',
   'jquery_ui/droppable'
], function( $, ng, visual, edgeHtml ) {
   'use strict';

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   var DIRECTIVE_NAME = 'nbeEdge';

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function createEdgeDirective( nbeAsync ) {

      return {
         restrict: 'A',
         replace: true,
         template: edgeHtml,
         controller: function EdgeController( $scope, $element ) {

            $( $element[ 0 ] ).draggable( {
               stack: '.graph *',
               containment: 'parent',
               start: handleEdgeDragStart,
               drag: nbeAsync.ensure( handleEdgeDrag ),
               stop: handleDrop
            } ).droppable( {
               accept: 'i',
               hoverClass: 'drop-hover',
               drop: handleDrop
            } );

            var graphController = $scope.nbeController;
            var linksToRepaint = [];
            // Make sure that a drag/drop is not interpreted as a click (so that the selection survives it).
            var cancelClick = false;

            //////////////////////////////////////////////////////////////////////////////////////////////////

            function handleEdgeDragStart() {
               linksToRepaint = graphController.links.controllers( [], [$scope.edgeId] );
               if( $element.hasClass( 'selected' ) ) {
                  graphController.selection.setAnchor( $element[ 0 ] );
               }
            }

            //////////////////////////////////////////////////////////////////////////////////////////////////

            function handleEdgeDrag() {
               cancelClick = true;
               ng.forEach( linksToRepaint, function( linkController ) {
                  linkController.repaint();
               } );
               if( $element.hasClass( 'selected' ) ) {
                  graphController.selection.followAnchor();
               }
            }

            //////////////////////////////////////////////////////////////////////////////////////////////////

            // noinspection JSUnusedLocalSymbols
            function handleDrop( event, ui ) {
               if( $( ui.helper ).hasClass( 'edge' ) ) {
                  // stopped dragging this edge
                  $scope.$apply( function() {
                     var edgeLayout = $scope.layout.edges[ $scope.edgeId ];
                     edgeLayout.left = ui.position.left;
                     edgeLayout.top = ui.position.top;
                     linksToRepaint = [];
                  } );
                  if( $element.hasClass( 'selected' ) ) {
                     graphController.selection.clearAnchor();
                  }
               }
               else {
                  // dropped a port onto this edge
                  $scope.nbeController.dragDrop.setDropRef( { nodeId: $scope.edgeId } );
                  visual.pingAnimation( $element );
               }
            }

            //////////////////////////////////////////////////////////////////////////////////////////////////

            $scope.handleEdgeClick = function( $event ) {
               if( cancelClick ) {
                  cancelClick = false;
                  return;
               }
               $scope.nbeController.selection.selectEdge( $scope.edgeId, $event.shiftKey );
            };

         }
      };


   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   return {
      define: function( module ) {
         module.directive( DIRECTIVE_NAME, ['nbeAsync', createEdgeDirective] );
      }
   };

} );