/**
 * Manages the graph drawing surface and offers related operations, such as ping animations and zoom.
 */
define( [ 'jquery', '../utilities/visual' ], function( $, visual ) {
   'use strict';

   /**
    * @param {object} layoutModel
    *    a layout model with coordinates for vertices and edges (read)
    * @param {object} viewModel
    *    the graph view model where zoom state is kept (read/write)
    * @param {object} layoutSettings
    *    configuration for the graph layout
    * @param {$} jqGraph
    *    a jQuery handle to the graph DOM
    * @param {Function} nextTick
    *    a function to schedule an asynchronous operation.
    */
   return function( layoutModel, viewModel, layoutSettings, jqGraph, nextTick ) {

      var repaintHandlers = [ adjustCanvasSize ];

      return {
         repaint: repaint,
         addRepaintHandler: addRepaintHandler,
         centerEdge: centerEdge,
         pingEdge: pingEdge,
         zoom: zoomController()
      };

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function addRepaintHandler( handler ) {
         repaintHandlers.push( handler );
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function repaint() {
         repaintHandlers.forEach( function( _ ) { _(); } );
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function pingEdge( id ) {
         nextTick( function() {
            visual.pingAnimation( $( '[data-nbe-edge="' + id + '"]' ) );
         } );
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      /** Center the given edge between the given nodes. */
      function centerEdge( id, fromRef, toRef ) {
         var edgeCenter = mean( centerCoords( fromRef.nodeId ), centerCoords( toRef.nodeId ) );
         layoutModel.edges[ id ] = {
            left: edgeCenter[ 0 ] - layoutSettings.edgeOffset,
            top: edgeCenter[ 1 ] - layoutSettings.edgeOffset
         };

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         function centerCoords( vertexId ) {
            var vertexLayout = layoutModel.vertices[ vertexId ];
            var jqVertex = $( '[data-nbe-vertex=' + vertexId + ']', jqGraph );
            return [ vertexLayout.left + jqVertex.width() / 2, vertexLayout.top + jqVertex.height() / 2 ];
         }

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         function mean( v1, v2 ) {
            return [ 0, 1 ].map( function( i ) {
               return Math.round( (v1[ i ] + v2[ i ]) / 2 );
            } );
         }
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      /**
       * Ensure the following conditions:
       *
       * - The graph drawing canvas must fill the available container, but leave space for scroll bars.
       * - The canvas must contain all nodes in the graph model.
       */
      function adjustCanvasSize() {
         var offsetContainer = jqGraph.offsetParent();
         var graphOffset = jqGraph.offset();
         var yScrollbarSpace = Math.max( 15, offsetContainer.height() - offsetContainer.get( 0 ).clientHeight );
         var xScrollbarSpace = Math.max( 15, offsetContainer.width() - offsetContainer.get( 0 ).clientWidth );
         var width = offsetContainer.width() - xScrollbarSpace;
         var height = offsetContainer.height() - yScrollbarSpace;

         var padding = layoutSettings.graphPadding;
         $( '.vertex, .edge', jqGraph[ 0 ] ).each( function( i, domNode ) {
            var jqVertex = $( domNode );
            var pos = jqVertex.offset();
            width = Math.max( width, pos.left - graphOffset.left + jqVertex.width() + padding );
            height = Math.max( height, pos.top - graphOffset.top + jqVertex.height() + padding );
         } );

         jqGraph.width( width ).height( height );
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      /**
       * Create a controller to allow zoom-out and zoom-in.
       *
       * @returns {{zoomOut: zoomOut, zoomIn: zoomIn}}
       */
      function zoomController() {

         function apply( level ) {
            var z = viewModel.zoom;
            z.percent = z.levels[ level ];
            z.factor = z.percent / 100;
            nextTick( function() {
               adjustCanvasSize();
               repaint();
            } );
         }

         var api = {
            canZoomIn: false,
            canZoomOut: true,
            zoomOut: function() {
               if( api.canZoomOut ) {
                  apply( --viewModel.zoom.level );
                  api.canZoomIn = true;
               }
               api.canZoomOut = viewModel.zoom.level > 0;
            },
            zoomIn: function() {
               var z = viewModel.zoom;
               if( api.canZoomIn ) {
                  apply( ++z.level );
                  api.canZoomOut = true;
               }
               api.canZoomIn = z.level < z.levels.length - 1;
            }
         };

         return api;
      }

   };

} );