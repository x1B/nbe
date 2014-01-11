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
               stop: handleEdgeDrop
            } );

            $( $element[ 0 ] ).droppable( {
               accept: 'i',
               hoverClass: 'drop-hover',
               drop: handleEdgeDrop
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

            function handleEdgeDrop() {
               graph.dropInfo.node = edgeId;
               graph.dropInfo.port = null;
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