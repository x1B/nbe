/**
 * An vertex is a node with 0..n ports input ports and 0..n output ports.
 * Each input port has 0..1 incoming links.
 * Each output port has 0..1 outgoing links.
 *
 * It represents a vertex in a directed graph model, and may participate in an arbitrary number of edges.
 */
define( [
   'jquery',
   'angular',
   '../utilities/visual',
   'text!./vertex.html',
   'jquery_ui/draggable',
   'jquery_ui/droppable'
], function( $, ng, visual, vertexHtml ) {
   'use strict';

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   var ATTR_VERTEX_ID = 'vertexId';

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function createVertexDirective( nbeAsync ) {
      return {
         restrict: 'A',
         replace: true,
         template: vertexHtml,
         controller: [ '$scope', '$element', function VertexController( $scope, $element ) {
            var graphController = $scope.controller;
            var id = $scope[ ATTR_VERTEX_ID ];

            var jqVertex = $( $element[ 0 ] );
            jqVertex.draggable( {
               stack: '.nbe-graph-nodes *',
               containment: 'parent',
               start: handleVertexDragStart,
               drag: nbeAsync.ensure( handleVertexDrag ),
               stop: handleVertexDragStop
            } );

            // Make sure that a drag/drop is not interpreted as a click (so that the selection survives it).
            var cancelClick = false;

            // When dragging from a port, it gets access to the bounding box for path rendering:
            var jqGraph = jqVertex.parent();
            this.calculateBox = calculateBox;
            $scope.nbeVertex = this;
            // Keep track of links that need repainting
            var linksToRepaint = [];

            //////////////////////////////////////////////////////////////////////////////////////////////////

            function handleVertexDragStart() {
               linksToRepaint = graphController.links.controllers( [id] );
               if( jqVertex.hasClass( 'nbe-selected' ) ) {
                  graphController.selection.setAnchor( $element[ 0 ] );
               }
            }

            //////////////////////////////////////////////////////////////////////////////////////////////////

            function handleVertexDrag() {
               cancelClick = true;
               ng.forEach( linksToRepaint, function( linkController ) {
                  linkController.repaint();
               } );
               if( jqVertex.hasClass( 'nbe-selected' ) ) {
                  graphController.selection.followAnchor();
               }
            }

            //////////////////////////////////////////////////////////////////////////////////////////////////

            function handleVertexDragStop( _, ui ) {
               $scope.$apply( function() {
                  linksToRepaint = [];
                  var zoomFactor = $scope.view.zoom.factor;
                  var layout = $scope.layout.vertices[ id ];
                  layout.left = ui.position.left / zoomFactor;
                  layout.top = ui.position.top / zoomFactor;
               } );
               if( jqVertex.hasClass( 'nbe-selected' ) ) {
                  graphController.selection.clearAnchor();
               }
            }

            //////////////////////////////////////////////////////////////////////////////////////////////////

            function calculateBox( box ) {
               visual.boundingBox( jqVertex, jqGraph, box );
            }

            //////////////////////////////////////////////////////////////////////////////////////////////////

            $scope.handleVertexClick = function( event ) {
               if( cancelClick ) {
                  cancelClick = false;
                  return;
               }
               graphController.selection.selectVertex( id, event.shiftKey );
            };
         } ]
      };
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   return {
      define: function( module ) {
         module.directive( 'nbeVertex', ['nbeAsync', createVertexDirective] );
      }
   };


} );