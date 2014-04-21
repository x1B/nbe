/**
 * An edge is a node which has no named ports, but can have 0..n input links and 0..n output links itself.
 *
 * It represents a multi-edge in a directed graph model, and may connect an arbitrary number of vertices.
 */
define( [
   'underscore',
   'jquery',
   'jquery.ui',
   'angular',
   '../utilities/async'
],
function ( _, $, jqueryUi, ng, async, undefined ) {
   'use strict';

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   var DIRECTIVE_NAME = 'nbeEdge';

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function createEdgeDirective( $timeout ) {
      return {
         restrict: 'A',
         controller: function EdgeController( $scope, $element ) {

            var jqEdge = $( $element[ 0 ] );
            var graph = $scope.nbeGraph;
            var edgeId = $scope.edgeId;

            jqEdge.draggable( {
               stack: '.graph *',
               containment: 'parent',
               start: handleEdgeDragStart,
               drag: async.repeatAfter( handleEdgeDrag, $timeout ),
               stop: handleDrop
            } );

            jqEdge.droppable( {
               accept: 'i',
               hoverClass: 'drop-hover',
               drop: handleDrop
            } );

            var linksToRepaint = [];
            this.jqEdge = $( $element[ 0 ] );
            this.jqGraph = $( $element[ 0 ].parentNode );

            $scope.nbeEdge = this;

            //////////////////////////////////////////////////////////////////////////////////////////////////

            function handleEdgeDragStart( event, ui ) {
               linksToRepaint = graph.edgeLinkControllers( edgeId );
            }

            //////////////////////////////////////////////////////////////////////////////////////////////////

            function handleEdgeDrag( event, ui ) {
               ng.forEach( linksToRepaint, function( linkController ) {
                  linkController.repaint();
               } );
            }

            //////////////////////////////////////////////////////////////////////////////////////////////////

            function handleDrop( event, ui ) {
               if ( $( ui.helper ).hasClass( 'edge' ) ) {
                  // stopped dragging this edge
                  var edgeLayout = $scope.layout.edges[ edgeId ];
                  edgeLayout.left = ui.position.left / $scope.canvas.width;
                  edgeLayout.top = ui.position.top / $scope.canvas.height;
                  linksToRepaint = [];
               }
               else {
                  // dropped a port onto this edge
                  graph.dropInfo.nodeId = edgeId;
                  graph.dropInfo.portId = null;
               }
            }

            //////////////////////////////////////////////////////////////////////////////////////////////////

            $scope.handleEdgeClick = function() {
               graph.selectEdge( edgeId );
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