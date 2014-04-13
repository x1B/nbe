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

            var graph = $scope.nbeGraph;
            var edgeId = $scope.edgeId;

            $( $element[ 0 ] ).draggable( {
               stack: '.graph *',
               containment: 'parent',
               start: handleEdgeDragStart,
               drag: async.repeatAfter( handleEdgeDrag, $timeout ),
               stop: handlePortDrop
            } );

            $( $element[ 0 ] ).droppable( {
               accept: 'i',
               hoverClass: 'drop-hover',
               drop: handlePortDrop
            } );

            var linkControllers = [];

            this.jqEdge = $( $element[ 0 ] );
            this.jqGraph = $( $element[ 0 ].parentNode );

            $scope.nbeEdge = this;

            //////////////////////////////////////////////////////////////////////////////////////////////////

            function handleEdgeDragStart( event, ui ) {
               linkControllers = graph.edgeLinkControllers( edgeId );
            }

            //////////////////////////////////////////////////////////////////////////////////////////////////

            function handleEdgeDrag( event, ui ) {
               ng.forEach( linkControllers, function( linkController ) {
                  linkController.updatePath();
               } );
            }

            //////////////////////////////////////////////////////////////////////////////////////////////////

            function handleEdgeStop() {
               linkControllers = [];
            }

            //////////////////////////////////////////////////////////////////////////////////////////////////

            function handlePortDrop() {
               graph.dropInfo.nodeId = edgeId;
               graph.dropInfo.portId = null;
            }

            //////////////////////////////////////////////////////////////////////////////////////////////////

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