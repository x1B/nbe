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
         controller: [ '$scope', '$element', function EdgeController( $scope, $element ) {

            var jqEdgeIcon = $( '.nbe-edge-icon', $element[ 0 ] );
            $element.draggable( {
               stack: '.nbe-graph-nodes *',
               handle: jqEdgeIcon,
               start: handleEdgeDragStart,
               drag: nbeAsync.ensure( handleEdgeDrag ),
               stop: handleDrop
            } );

            jqEdgeIcon.droppable( {
               accept: function() {
                  return graphController.dragDrop.canConnect( {
                     nodeId: $scope.edgeId,
                     edge: $scope.$parent.edge
                  } );
               },
               hoverClass: 'nbe-drop-hover',
               drop: handleDrop
            } );

            var graphController = $scope.controller;
            var linksToRepaint = [];
            // Make sure that a drag/drop is not interpreted as a click (so that the selection survives it).
            var cancelClick = false;

            //////////////////////////////////////////////////////////////////////////////////////////////////

            function handleEdgeDragStart() {
               linksToRepaint = graphController.links.controllers( [], [ $scope.edgeId ] );
               if( $element.hasClass( 'nbe-selected' ) ) {
                  graphController.selection.setAnchor( $element[ 0 ] );
               }
            }

            //////////////////////////////////////////////////////////////////////////////////////////////////

            function handleEdgeDrag() {
               cancelClick = true;
               ng.forEach( linksToRepaint, function( linkController ) {
                  linkController.repaint();
               } );
               if( $element.hasClass( 'nbe-selected' ) ) {
                  graphController.selection.followAnchor();
               }
               $scope.$emit( 'nbeRepaint' );
            }

            //////////////////////////////////////////////////////////////////////////////////////////////////

            // noinspection JSUnusedLocalSymbols
            function handleDrop( event, ui ) {
               if( $( ui.helper ).hasClass( 'nbe-edge' ) ) {
                  // stopped dragging this edge
                  $scope.$apply( function() {
                     var zoomFactor = $scope.view.zoom.factor;
                     var edgeLayout = $scope.layout.edges[ $scope.edgeId ];
                     edgeLayout.left = ui.position.left / zoomFactor;
                     edgeLayout.top = ui.position.top / zoomFactor;
                     linksToRepaint = [];
                  } );
                  if( $element.hasClass( 'nbe-selected' ) ) {
                     graphController.selection.clearAnchor();
                  }
               }
               else {
                  // dropped a port onto this edge
                  $scope.controller.dragDrop.setDropRef( {
                     nodeId: $scope.edgeId,
                     edgeType: $scope.$parent.edge.type
                  } );
                  visual.pingAnimation( $element );
               }
            }

            //////////////////////////////////////////////////////////////////////////////////////////////////

            $scope.handleEdgeClick = function( $event ) {
               if( cancelClick ) {
                  cancelClick = false;
                  return;
               }
               $scope.controller.selection.selectEdge( $scope.edgeId, $event.shiftKey );
            };

         } ]
      };


   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   return {
      define: function( module ) {
         module.directive( DIRECTIVE_NAME, [ 'nbeAsync', createEdgeDirective ] );
      }
   };

} );