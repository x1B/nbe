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

      // graph clipping box
      var jqViewport = $( '.nbe-graph-viewport', jqGraph );
      // graph canvas (foreground)
      var jqNodes = $( '.nbe-graph-canvas', jqGraph );

      var repaintRequested = false;
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
         if( repaintRequested ) {
            return;
         }
         repaintRequested = true;
         window.requestAnimationFrame( function() {
            repaintHandlers.forEach( function ( _ ) { _(); } );
            repaintRequested = false;
         } );
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
            var jqVertex = $( '[data-nbe-vertex="' + vertexId + '"]', jqGraph );
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
       * - The graph drawing canvas must fill the available container (for the grid).
       * - The canvas must not cause scrollbars to be shown unless required.
       * - The canvas must contain all nodes in the graph model.
       */
      function adjustCanvasSize() {
         var graphOffset = jqGraph.offset();
         console.log( 'graphOffset', graphOffset.left );
         var yScrollbarSpace = Math.max( 18, jqViewport.height() - jqViewport.get( 0 ).clientHeight );
         var xScrollbarSpace = Math.max( 18, jqViewport.width() - jqViewport.get( 0 ).clientWidth );
         var width = jqGraph.width() - xScrollbarSpace;
         var height = jqGraph.height() - yScrollbarSpace;

         var padding = layoutSettings.graphPadding;
         $( '.nbe-vertex, .nbe-edge', jqGraph[ 0 ] ).each( function( i, domNode ) {
            var jqVertex = $( domNode );
            var pos = jqVertex.position();
            width = Math.max( width, pos.left + jqVertex.width() + padding );
            height = Math.max( height, pos.top + jqVertex.height() + padding );
         } );

         jqNodes.css( 'min-width', width+'px' ).css( 'min-height', height+'px' );
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