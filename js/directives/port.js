define( [
   'jquery',
   'angular',
   '../utilities/pathing',
   'jquery_ui/draggable',
   'jquery_ui/droppable'
], function( $, ng, pathing ) {
   'use strict';

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   var DIRECTIVE_NAME = 'nbePort';
   var ATTR_VERTEX_ID = 'vertexId';
   var ATTR_PORT_DIRECTION = 'nbePortDirection';

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function createPortDirective( nbeLayoutSettings ) {

      var dragOffset = nbeLayoutSettings.portOffset;

      return {
         restrict: 'A',
         link: function linkPort( scope, element, attrs ) {

            // Quick access to essential data for drawing links:
            var graphController = scope.controller;
            var graphOffset;
            var direction = attrs[ ATTR_PORT_DIRECTION ];
            var isInput = direction === 'inbound';
            var stubDirection = isInput ? -1 : 1;

            var vertexId = scope[ ATTR_VERTEX_ID ];
            var jqGraph = graphController.jqGraph;
            var jqPortGhost = $( '.nbe-port.nbe-ghost', jqGraph );
            var jqLinkGhost = $( '.nbe-link.nbe-ghost', jqGraph );
            // Drag starting position, relative to graph canvas.
            var fromLeft, fromTop, fromBox = { top: 0, bottom: 0, left: 0, right: 0 };

            var ref = {
               nodeId: vertexId,
               port: scope.port,
               direction: direction
            };

            $( 'i', element[ 0 ] ).draggable( {
               opacity: 0.8,
               helper: function() {
                  return $( '.nbe-port.nbe-ghost', jqGraph ).clone().show();
               },
               zIndex: 1000,
               start: handlePortDragStart,
               drag: handlePortDrag,
               stop: handlePortDragStop,
               addClasses: false,
               appendTo: jqGraph
            } ).on( 'dblclick', handlePortDoubleClick );

            element.droppable( {
               accept: function() {
                  return graphController.dragDrop.canConnect( ref );
               },
               hoverClass: 'nbe-drop-hover',
               drop: handlePortDrop
            } );

            var basicLinkClass = jqLinkGhost.attr( 'class' ) + ' ';

            //////////////////////////////////////////////////////////////////////////////////////////////////

            function supportsMultipleLinks() {
               var typeDef = scope.types[ scope.port.type ];
               return typeDef.simple && 1 === (isInput ? typeDef.maxDestinations : typeDef.maxSources );
            }

            //////////////////////////////////////////////////////////////////////////////////////////////////

            function handlePortDoubleClick() {
               if( scope.port.edgeId ) {
                  var disconnectOp = graphController.operations.disconnect( {
                     nodeId: scope[ ATTR_VERTEX_ID ],
                     port: scope.port
                  } );
                  graphController.operations.perform( disconnectOp );
               }
            }

            //////////////////////////////////////////////////////////////////////////////////////////////////

            function handlePortDragStart( event, ui ) {
               var jqHandle = $( event.target );

               var dd = graphController.dragDrop;
               var transaction = dd.start( ref, function() {
                  $( 'i', element[ 0 ] ).trigger( 'mouseup' );
               } );

               if( scope.port.edgeId && !supportsMultipleLinks() ) {
                  var disconnectOp = graphController.operations.disconnect( {
                     nodeId: scope[ ATTR_VERTEX_ID ],
                     port: scope.port,
                     direction: direction
                  } );
                  transaction.perform( disconnectOp );
               }

               var p = jqHandle.offset();
               graphOffset = jqGraph.offset();

               fromLeft = p.left - graphOffset.left + dragOffset;
               fromTop = p.top - graphOffset.top + dragOffset;
               scope.nbeVertex.calculateBox( fromBox );

               ui.helper.addClass( 'nbe-type-' + scope.port.type ).show();
               jqLinkGhost.attr( 'class', basicLinkClass + 'nbe-type-' + scope.port.type ).show();
            }

            //////////////////////////////////////////////////////////////////////////////////////////////////

            // noinspection JSUnusedLocalSymbols
            function handlePortDrag( _, ui ) {
               var zoomFactor = scope.view.zoom.factor;
               var pos = ui.offset;
               var toLeft = pos.left - graphOffset.left + (dragOffset*zoomFactor);
               var toTop = pos.top - graphOffset.top + (dragOffset*zoomFactor);
               jqLinkGhost.attr( 'd',
                  pathing.cubic(
                     [fromLeft, fromTop],
                     [toLeft, toTop],
                     [stubDirection, 0],
                     zoomFactor,
                     [fromBox, null],
                     false ) );
            }

            //////////////////////////////////////////////////////////////////////////////////////////////////

            function handlePortDragStop() {
               jqPortGhost.removeClass( 'nbe-type-' + scope.port.type );
               jqLinkGhost.attr( 'class', basicLinkClass ).hide();

               var dd = graphController.dragDrop;
               if( !dd.dropRef() ) {
                  dd.finish();
                  return;
               }

               var op = graphController.operations.connect( ref, dd.dropRef() );
               dd.transaction().perform( op );
               dd.finish();
            }

            //////////////////////////////////////////////////////////////////////////////////////////////////

            function handlePortDrop() {
               graphController.dragDrop.setDropRef( ref );
            }

         }
      };

   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   return {
      define: function( module ) {
         module.directive( DIRECTIVE_NAME, [ 'nbeLayoutSettings', createPortDirective ] );
      }
   };

} );
