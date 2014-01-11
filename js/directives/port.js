define( [
   'underscore',
   'jquery',
   'jquery.ui',
   'angular',
   '../utilities/layout',
   '../utilities/pathing'
],
function ( _, $, jqueryUi, ng, layout, svgLinkPath, undefined ) {
   'use strict';

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   var DIRECTIVE_NAME = 'nbePort';

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   var PORT_CLASS_IN = 'in', PORT_CLASS_OUT = 'out';

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function createPortDirective( $timeout ) {

      return {
         restrict: 'A',
         controller: function PortController( $scope, $element, $attrs ) {

            var graph = $scope.nbeGraph;
            var portGroup = $attrs[ 'nbePortGroup' ];
            var stubType = portGroup === PORT_CLASS_OUT ? 1 : -1;
            var connect = portGroup === PORT_CLASS_OUT ? graph.connectToEdge : graph.connectFromEdge;

            var vertexId = $scope.vertexId;
            var portId = $scope.portId;
            var portType = $scope.port.type || '';
            // console.log( $scope.port.label, $( 'i', $element[0] )[0], $scope.port.type );

            var jqGraph = graph.jqGraph;
            var jqPortGhost = $( '.port.GHOST', jqGraph );
            var jqLinkGhost= $( '.link.GHOST', jqGraph );

            // Drag starting position, relative to graph canvas.
            var fromLeft, fromTop, fromBox = { top: 0, bottom: 0, left: 0, right: 0 };
            var graphOffset;

            $( 'i', $element[0] ).draggable( {
               opacity: 0.8,
               helper: function() {
                  return $( '.GHOST.port', jqGraph ).clone().show();
               },
               zIndex: 1000,
               start: handlePortDragStart,
               drag: handlePortDrag,
               stop: handlePortDragStop,
               addClasses: false,
               appendTo: jqGraph
            } );

            var basicLinkClass = jqLinkGhost.attr( "class" ) + " ";

            //////////////////////////////////////////////////////////////////////////////////////////////////

            function handlePortDragStart( event, ui ) {
               var jqHandle = $( event.target );

               graph.disconnect( $scope.vertexId, $scope.portId, $scope.port );
               graph.dragNodeId = $scope.vertexId;
               graph.dragPortId = $scope.portId;

               var p = jqHandle.offset();
               graphOffset = jqGraph.offset();

               fromLeft = p.left - graphOffset.left + layout.PORT_DRAG_OFFSET;
               fromTop = p.top - graphOffset.top + layout.PORT_DRAG_OFFSET;
               $scope.nbeVertex.calculateBox( fromBox );

               ui.helper.addClass( portType ).show();
               jqLinkGhost.attr( "class", basicLinkClass + portType ).show();
            }

            //////////////////////////////////////////////////////////////////////////////////////////////////

            function handlePortDrag( event, ui ) {
               var pos = ui.offset;
               var toLeft = pos.left - graphOffset.left + layout.PORT_DRAG_OFFSET;
               var toTop = pos.top - graphOffset.top + layout.PORT_DRAG_OFFSET;
               jqLinkGhost.attr( "d", svgLinkPath( fromLeft, fromTop, toLeft, toTop, stubType, 0, fromBox, null ) );
            }

            //////////////////////////////////////////////////////////////////////////////////////////////////

            function handlePortDragStop() {
               // console.log( 'port ', portId, 'drop to', graph.dropInfo );
               jqPortGhost.removeClass( portType );
               jqLinkGhost.attr( "class", basicLinkClass ).hide();
               if ( graph.dropInfo.node ) {
                  // check if types match...
                  connect( vertexId, portId, $scope.port, graph.dropInfo.node, graph.dropInfo.port );
                  graph.dropInfo.node = graph.dropInfo.port = null;
               }
            }

            //////////////////////////////////////////////////////////////////////////////////////////////////

         }
      };

   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   return {
      define: function( module ) {
         module.directive( DIRECTIVE_NAME, [ '$timeout', createPortDirective ] );
      }
   }

} );
