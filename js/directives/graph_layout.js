define( [], function() {
   'use strict';

   return function graphLayoutController( jqGraph ) {

      function centerCoords( vertexId ) {
         var vertexLayout = layout.vertices[ vertexId ];
         var jqVertex = $( '[data-nbe-vertex=' + vertexId + ']', jqGraph );
         return [ vertexLayout.left + jqVertex.width() / 2, vertexLayout.top + jqVertex.height() / 2 ];
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function mean( v1, v2 ) {
         return [ 0, 1 ].map( function ( i ) {
            return Math.round( (v1[ i ] + v2[ i ]) / 2 );
         } );
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function calculateLayout() {
         async.runEventually( function () {
            var input = $scope.model;
            if ( !self.selection.isEmpty() ) {
               var sel = $scope.view.selection;
               input = { edges: {}, vertices: {} };
               Object.keys( sel.edges ).forEach( function ( edgeId ) {
                  input.edges[ edgeId ] = $scope.model.edges[ edgeId ];
               } );
               Object.keys( sel.vertices ).forEach( function ( vertexId ) {
                  input.vertices[ vertexId ] = $scope.model.vertices[ vertexId ];
               } );
            }

            var result = autoLayout.calculate( input, $scope.types, jqGraph, $scope.view.zoom.factor );
            if ( result ) {
               Object.keys( result.edges ).forEach( function ( edgeId ) {
                  layout.edges[ edgeId ] = result.edges[ edgeId ];
               } );
               Object.keys( result.vertices ).forEach( function ( vertexId ) {
                  layout.vertices[ vertexId ] = result.vertices[ vertexId ];
               } );
               $timeout( repaint );
               $timeout( adjustCanvasSize );
            }
            return !!result;
         }, $scope, 1500 );
      }


      /**
       * The graph drawing canvas must fill the available container.
       * It also must accommodate all nodes in the graph model.
       * Third, it needs to take into account the current zoom level when calculating the space needed
       * by the graph model.
       *
       * In each dimension, pick max( offset container size, content size ) and use it as the canvas size.
       */
      function adjustCanvasSize() {
         var offsetContainer = jqGraph.offsetParent();
         var graphOffset = jqGraph.offset();
         var yScrollbarSpace = Math.max( 15, offsetContainer.height() - offsetContainer.get( 0 ).clientHeight );
         var xScrollbarSpace = Math.max( 15, offsetContainer.width() - offsetContainer.get( 0 ).clientWidth );
         var width = offsetContainer.width() - xScrollbarSpace;
         var height = offsetContainer.height() - yScrollbarSpace;

         var padding = layoutSettings.graphPadding;
         $( '.vertex, .edge', jqGraph[ 0 ] ).each( function ( i, domNode ) {
            var jqVertex = $( domNode );
            var pos = jqVertex.offset();
            width = Math.max( width, pos.left - graphOffset.left + jqVertex.width() + padding );
            height = Math.max( height, pos.top - graphOffset.top + jqVertex.height() + padding );
         } );

         jqGraph.width( width ).height( height );
      }

      /////////////////////////////////////////////////////////////////////////////////////////////////////

      function repaint() {
         self.links.repaint();
      }


      function zoomController() {

         function apply( level ) {
            var z = view.zoom;
            z.percent = z.levels[ level ];
            z.factor = z.percent / 100;
            $timeout( function () {
               adjustCanvasSize();
               self.links.repaint();
            }, 0 );
         }

         return {
            zoomOut: function () {
               var z = view.zoom;
               if ( z.level > 0 ) {
                  apply( --z.level );
               }
            },
            zoomIn: function () {
               var z = view.zoom;
               if ( z.level < z.levels.length - 1 ) {
                  apply( ++z.level );
               }
            }
         };
      }

   };

} );