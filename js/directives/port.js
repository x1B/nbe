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

            var connectToEdge, connectToVertex;


            var connectEdge = portGroup === PORT_CLASS_OUT ? graph.connectPortToEdge : graph.connectPortFromEdge;
            var connectVertex = graph.connectPortToPort;

            var vertexId = $scope.vertexId;
            var portType = $scope.port.type || '';
            // console.log( $scope.port.label, $( 'i', $element[0] )[0], $scope.port.type );

            var jqGraph = graph.jqGraph;
            var jqPortGhost = $( '.port.GHOST', jqGraph );
            var jqLinkGhost= $( '.link.GHOST', jqGraph );

            // Drag starting position, relative to graph canvas.
            var fromLeft, fromTop, fromBox = { top: 0, bottom: 0, left: 0, right: 0 };
            var graphOffset;

            $( 'i', $element[ 0 ] ).draggable( {
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
            } ).droppable( {
               accept: 'i',
               hoverClass: 'drop-hover',
               drop: handlePortDrop
            } );

            var basicLinkClass = jqLinkGhost.attr( "class" ) + " ";

            //////////////////////////////////////////////////////////////////////////////////////////////////

            function handlePortDragStart( event, ui ) {
               var jqHandle = $( event.target );

               graph.disconnect( $scope.vertexId, $scope.port );
               graph.dragNodeId = $scope.vertexId;
               graph.dragPortId = $scope.port.id;

               jqGraph.addClass( 'highlight-' + portType );

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
               jqGraph.removeClass( 'highlight-' + portType );


               if ( !graph.dropInfo.nodeId ) {
                  return;
               }

               if( graph.dropInfo.port ) {
                  if( portGroup === PORT_CLASS_OUT ) {
                     connectVertex( vertexId, $scope.port, graph.dropInfo.nodeId, graph.dropInfo.port );
                  }
                  else {
                     connectVertex( graph.dropInfo.nodeId, graph.dropInfo.port, vertexId, $scope.port );
                  }
               }
               else {
                  connectEdge( vertexId, $scope.port, graph.dropInfo.nodeId, undefined );
               }
               graph.dropInfo.nodeId = graph.dropInfo.port = null;
            }

            //////////////////////////////////////////////////////////////////////////////////////////////////

            function handlePortDrop() {
               graph.dropInfo.nodeId = vertexId;
               graph.dropInfo.port = $scope.port;
            }

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
