define( [
   'jquery',
   'angular',
   'text!./minimap.html'
], function( $, ng, minimapHtml ) {
   'use strict';

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   var DIRECTIVE_NAME = 'nbeMinimap';

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function createMinimapDirective( nbeLayoutSettings ) {

      return {
         restrict: 'A',
         replace: true,
         template: minimapHtml,
         controller: [ '$scope', '$element', function( $scope, $element ) {
            var wrapper = $element[ 0 ];
            wrapper.style.display = 'none';
            var hidden = true;

            var svg = document.createElementNS( xmlns, 'svg' );
            svg.setAttributeNS( null, 'viewBox', '0 0 10 10' );
            svg.setAttributeNS( null, 'class', 'nbe-minimap-graph' );
            svg.addEventListener( 'click', centerAt );
            svg.addEventListener( 'mousedown', follow );
            wrapper.appendChild( svg );

            var viewBox = document.createElementNS( xmlns, 'rect' );
            viewBox.setAttributeNS( null, 'class', 'nbe-minimap-viewbox' );
            svg.appendChild( viewBox );

            var map;

            $scope.controller.canvas.addRepaintHandler( repaint );

            //////////////////////////////////////////////////////////////////////////////////////////////////

            function follow( e ) {
               centerAt( e );
               svg.addEventListener( 'mousemove', centerAt );
               $( document ).one( 'mouseup', function() {
                  svg.removeEventListener( 'mousemove', centerAt );
               } );
            }

            //////////////////////////////////////////////////////////////////////////////////////////////////

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

               // :TODO: figure out when to repaint the graph:
               repaintGraph();
            }

            //////////////////////////////////////////////////////////////////////////////////////////////////

            function repaintGraph() {
               var domGraph = wrapper.parentNode;

               if( map ) {
                  svg.removeChild( map );
                  map = null;
               }

               // :TODO: reuse DOM:
               map = document.createElementNS( xmlns, 'g' );
               svg.appendChild( map );

               var domVertices = domGraph.querySelectorAll( '.nbe-vertex' );
               ng.forEach( domVertices, function( domVertex ) {
                  var jqVertex = $( domVertex );
                  var v = document.createElementNS( xmlns, 'rect' );
                  v.setAttribute( 'x', jqVertex.position().left );
                  v.setAttribute( 'y', jqVertex.position().top );
                  v.setAttribute( 'width', jqVertex.width() );
                  v.setAttribute( 'height', jqVertex.height() );
                  v.setAttribute( 'class', 'nbe-minimap-vertex' );
                  v.setAttribute( 'rx', 10 );
                  v.setAttribute( 'ry', 10 );

                  map.appendChild( v );
               } );

               var domEdges = domGraph.querySelectorAll( '.nbe-edge' );
               ng.forEach( domEdges, function( domVertex ) {
                  var jqEdge = $( domVertex );
                  var e = document.createElementNS( xmlns, 'circle' );
                  var r = jqEdge.width();
                  e.setAttribute( 'cx', jqEdge.position().left + r/2 );
                  e.setAttribute( 'cy', jqEdge.position().top + r/2 );
                  e.setAttribute( 'r', r );
                  e.setAttribute( 'class', 'nbe-minimap-edge' );
                  map.appendChild( e );
               } );
            }

            //////////////////////////////////////////////////////////////////////////////////////////////////

         } ]
      };
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   var floor = Math.floor;
   var max = Math.max;
   var min = Math.min;
   var xmlns = 'http://www.w3.org/2000/svg';

   return {
      define: function( module ) {
         module.directive( DIRECTIVE_NAME, [ 'nbeLayoutSettings', createMinimapDirective ] );
      }
   };

} );