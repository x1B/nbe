define( [
   'jquery',
   'angular',
   'text!./minimap.html',
   'jquery_ui/draggable'
], function( $, ng, minimapHtml ) {
   'use strict';

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   var DIRECTIVE_NAME = 'nbeMinimap';

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function createMinimapDirective( nbeLayoutSettings ) {

      var floor = Math.floor;
      var max = Math.max;
      var min = Math.min;

      return {
         restrict: 'A',
         replace: true,
         template: minimapHtml,
         controller: [ '$scope', '$element', function( $scope, $element ) {

            var xmlns = "http://www.w3.org/2000/svg";
            var svg = document.createElementNS( xmlns, 'svg' );
            svg.setAttributeNS( null, 'viewBox', '0 0 10 10' );
            svg.setAttributeNS( null, 'class', 'nbe-minimap-graph' );

            var wrapper = $element[ 0 ];
            wrapper.style.display = 'none';
            wrapper.appendChild( svg );

            var viewBox = document.createElementNS( xmlns, 'rect' );
            svg.appendChild( viewBox );

            $scope.controller.canvas.addRepaintHandler( repaint );
            svg.addEventListener( 'click', centerAt );

            var hidden = true;

            /** Center the canvas viewport at the target coordinate implied by the given mouse event. */
            function centerAt( e ) {
               var mapX = e.layerX;
               var mapY = e.layerY;
               var mapWidth = svg.width.baseVal.value;
               var mapHeight= svg.height.baseVal.value;

               var canvas = $scope.view.canvas;
               var viewport = $scope.view.viewport;

               var targetX = (mapX/mapWidth) * canvas.width - 0.5*viewport.width;
               var safeTargetX = max( 0, min( canvas.width - viewport.width, targetX ) );

               var targetY = (mapY/mapHeight) * canvas.height - 0.5*viewport.height;
               var safeTargetY = max( 0, min( canvas.height - viewport.height, targetY ) );

               var viewportNode = wrapper.parentNode.querySelector( '.nbe-graph-viewport' );
               viewportNode.scrollLeft = safeTargetX;
               viewportNode.scrollTop = safeTargetY;
            }

            //////////////////////////////////////////////////////////////////////////////////////////////////

            function repaint() {
               var canvas = $scope.view.canvas;
               var viewPort = $scope.view.viewport;

               if( canvas.width === viewPort.width && canvas.height === viewPort.height ) {
                  if( !hidden ) {
                     wrapper.style.display = 'none';
                     hidden = true;
                     return;
                  }
               }
               else {
                  if( hidden ) {
                     wrapper.style.display = 'block';
                     hidden = false;
                     return;
                  }
               }

               var canvasBox = [ 0, 0, floor( canvas.width ), floor( canvas.height ) ];
               svg.setAttribute( 'viewBox', canvasBox.join( ' ' ) );

               viewBox.setAttribute( 'x', viewPort.left );
               viewBox.setAttribute( 'y', viewPort.top );
               viewBox.setAttribute( 'width', viewPort.width );
               viewBox.setAttribute( 'height', viewPort.height );
            }
         } ]
      };
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   return {
      define: function( module ) {
         module.directive( DIRECTIVE_NAME, [ 'nbeLayoutSettings', createMinimapDirective ] );
      }
   };

} );