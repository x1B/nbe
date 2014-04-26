define( [
   'jquery',
   'angular',
   '../utilities/layout',
   '../utilities/pathing',
   'jquery_ui/draggable',
   'jquery_ui/droppable'
],
function ( $, ng, layout, svgLinkPath ) {
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
            // For drawing links:
            var stubDirection = $attrs[ 'nbePortGroup' ] === PORT_CLASS_OUT ? 1 : -1;

            var vertexId = $scope.vertexId;

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

            var basicLinkClass = jqLinkGhost.attr( 'class' ) + ' ';

            //////////////////////////////////////////////////////////////////////////////////////////////////

            function handlePortDragStart( event, ui ) {
               var jqHandle = $( event.target );

               var dd = graph.dragDrop;
               var transaction = dd.start( { nodeId: $scope.vertexId, port: $scope.port} );

               if ( $scope.port.edgeId ) {
                  var disonnectOp = graph.makeDisconnectOp( { nodeId: $scope.vertexId, port: $scope.port } );
                  transaction.perform( disonnectOp );
               }

               var p = jqHandle.offset();
               graphOffset = jqGraph.offset();

               fromLeft = p.left - graphOffset.left + layout.PORT_DRAG_OFFSET;
               fromTop = p.top - graphOffset.top + layout.PORT_DRAG_OFFSET;
               $scope.nbeVertex.calculateBox( fromBox );

               ui.helper.addClass( $scope.port.type ).show();
               jqLinkGhost.attr( 'class', basicLinkClass + $scope.port.type ).show();
            }

            //////////////////////////////////////////////////////////////////////////////////////////////////

            function handlePortDrag( event, ui ) {
               var pos = ui.offset;
               var toLeft = pos.left - graphOffset.left + layout.PORT_DRAG_OFFSET;
               var toTop = pos.top - graphOffset.top + layout.PORT_DRAG_OFFSET;
               jqLinkGhost.attr( 'd', svgLinkPath( fromLeft, fromTop, toLeft, toTop, stubDirection, 0, fromBox, null, true ) );
            }

            //////////////////////////////////////////////////////////////////////////////////////////////////

            function handlePortDragStop() {
               jqPortGhost.removeClass( $scope.port.type );
               jqLinkGhost.attr( 'class', basicLinkClass ).hide();

               var dd = graph.dragDrop;
               if ( !dd.dropRef() ) {
                  dd.finish();
                  return;
               }

               var op = graph.makeConnectOp( { nodeId: vertexId, port: $scope.port }, dd.dropRef() );
               dd.transaction().perform( op );
               dd.finish();
            }

            //////////////////////////////////////////////////////////////////////////////////////////////////

            function handlePortDrop() {
               graph.dragDrop.setDropRef( { nodeId: vertexId, port: $scope.port } );
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
