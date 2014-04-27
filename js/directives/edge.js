/**
 * An edge is a node which has no named ports, but can have 0..n input links and 0..n output links itself.
 *
 * It represents a multi-edge in a directed graph model, and may connect an arbitrary number of vertices.
 */
define( [
   'jquery',
   'angular',
   '../utilities/async',
   'text!./edge.html',
   'jquery_ui/draggable',
   'jquery_ui/droppable'
],
function ( $, ng, async, edgeHtml ) {
   'use strict';

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   var DIRECTIVE_NAME = 'nbeEdge';

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function createEdgeDirective( $timeout ) {
      return {
         restrict: 'A',
         replace: true,
         template: edgeHtml,
         controller: function EdgeController( $scope, $element ) {

            $( $element[ 0 ] ).draggable( {
               stack: '.graph *',
               containment: 'parent',
               start: handleEdgeDragStart,
               drag: async.ensure( handleEdgeDrag, $timeout ),
               stop: handleDrop
            } ).droppable( {
               accept: 'i',
               hoverClass: 'drop-hover',
               drop: handleDrop
            } );

            var linksToRepaint = [];
            $scope.nbeEdge = this;

            //////////////////////////////////////////////////////////////////////////////////////////////////

            function handleEdgeDragStart() {
               linksToRepaint = $scope.nbeGraph.edgeLinkControllers( $scope.edgeId );
            }

            //////////////////////////////////////////////////////////////////////////////////////////////////

            function handleEdgeDrag() {
               ng.forEach( linksToRepaint, function( linkController ) {
                  linkController.repaint();
               } );
            }

            //////////////////////////////////////////////////////////////////////////////////////////////////

            // noinspection JSUnusedLocalSymbols
            function handleDrop( event, ui ) {
               if ( $( ui.helper ).hasClass( 'edge' ) ) {
                  // stopped dragging this edge
                  var edgeLayout = $scope.layout.edges[ $scope.edgeId ];
                  edgeLayout.left = ui.position.left / $scope.canvas.width;
                  edgeLayout.top = ui.position.top / $scope.canvas.height;
                  linksToRepaint = [];
               }
               else {
                  // dropped a port onto this edge
                  $scope.nbeGraph.dragDrop.setDropRef( { nodeId: $scope.edgeId } );
               }
            }

            //////////////////////////////////////////////////////////////////////////////////////////////////

            $scope.handleEdgeClick = function() {
               $scope.nbeGraph.selectEdge( $scope.edgeId );
            };

         }
      };
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   return {
      define: function( module ) {
         module.directive( DIRECTIVE_NAME, [ '$timeout', createEdgeDirective ] );
      }
   };

} );