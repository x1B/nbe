define( [
   'jquery',
   'angular',
   '../utilities/pathing',
   'text!./port.html',
   'jquery_ui/draggable',
   'jquery_ui/droppable'
],
function ( $, ng, pathing, portHtml ) {
   'use strict';

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   var DIRECTIVE_NAME = 'nbePort';
   var ATTR_VERTEX_ID = 'vertexId';
   var ATTR_PORT_GROUP = 'nbePortGroup';

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function createPortDirective( nbeLayoutSettings ) {

      var dragOffset = nbeLayoutSettings.portDragOffset;

      return {
         restrict: 'A',
         replace: true,
         template: portHtml,
         link: function linkPort( $scope, $element, $attrs ) {

            // Quick access to essential data for drawing links:
            var graphController = $scope.nbeController;
            var graphOffset;
            var stubDirection = $attrs[ ATTR_PORT_GROUP ] !== 'in' ? 1 : -1;
            var vertexId = $scope[ ATTR_VERTEX_ID ];
            var jqGraph = graphController.jqGraph;
            var jqPortGhost = $( '.port.GHOST', jqGraph );
            var jqLinkGhost = $( '.link.GHOST', jqGraph );
            // Drag starting position, relative to graph canvas.
            var fromLeft, fromTop, fromBox = { top: 0, bottom: 0, left: 0, right: 0 };

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
            } ).on( 'dblclick', handlePortDoubleClick );

            var basicLinkClass = jqLinkGhost.attr( 'class' ) + ' ';

            //////////////////////////////////////////////////////////////////////////////////////////////////

            function handlePortDoubleClick() {
               if ( $scope.port.edgeId ) {
                  var disconnectOp = graphController.makeDisconnectOp( {
                     nodeId: $scope[ ATTR_VERTEX_ID ],
                     port: $scope.port
                  } );
                  graphController.operations.perform( disconnectOp );
               }
            }

            //////////////////////////////////////////////////////////////////////////////////////////////////

            function handlePortDragStart( event, ui ) {
               var jqHandle = $( event.target );

               var dd = graphController.dragDrop;
               var transaction = dd.start( { nodeId: $scope[ ATTR_VERTEX_ID ], port: $scope.port}, function() {
                  $( 'i', $element[ 0 ] ).trigger( 'mouseup' );
               } );

               if ( $scope.port.edgeId ) {
                  var disconnectOp = graphController.makeDisconnectOp( {
                     nodeId: $scope[ ATTR_VERTEX_ID ],
                     port: $scope.port
                  } );
                  transaction.perform( disconnectOp );
               }

               var p = jqHandle.offset();
               graphOffset = jqGraph.offset();

               fromLeft = p.left - graphOffset.left + dragOffset;
               fromTop = p.top - graphOffset.top + dragOffset;
               $scope.nbeVertex.calculateBox( fromBox );

               ui.helper.addClass( $scope.port.type ).show();
               jqLinkGhost.attr( 'class', basicLinkClass + $scope.port.type ).show();
            }

            //////////////////////////////////////////////////////////////////////////////////////////////////

            // noinspection JSUnusedLocalSymbols
            function handlePortDrag( _, ui ) {
               var pos = ui.offset;
               var toLeft = pos.left - graphOffset.left + dragOffset;
               var toTop = pos.top - graphOffset.top + dragOffset;
               jqLinkGhost.attr(
                  'd',
                  pathing.cubic( fromLeft, fromTop, toLeft, toTop, stubDirection, 0, fromBox, null, true )
               );
            }

            //////////////////////////////////////////////////////////////////////////////////////////////////

            function handlePortDragStop() {
               jqPortGhost.removeClass( $scope.port.type );
               jqLinkGhost.attr( 'class', basicLinkClass ).hide();

               var dd = graphController.dragDrop;
               if ( !dd.dropRef() ) {
                  dd.finish();
                  return;
               }

               var op = graphController.makeConnectOp( { nodeId: vertexId, port: $scope.port }, dd.dropRef() );
               dd.transaction().perform( op );
               dd.finish();
            }

            //////////////////////////////////////////////////////////////////////////////////////////////////

            function handlePortDrop() {
               graphController.dragDrop.setDropRef( { nodeId: vertexId, port: $scope.port } );
            }

         }
      };

   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   return {
      define: function( module ) {
         module.directive( DIRECTIVE_NAME, createPortDirective );
      }
   };

} );
