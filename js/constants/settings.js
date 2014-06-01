/**
 * Dagre-based graph layout service.
 * Edges and vertices are fed to dagre layouter as nodes, and links are fed as edges.
 */
define( [], function() {
   'use strict';

   return {

      layout: {
         /** When dragging a port, how much to set it off left and top. */
         portOffset: 8,
         /** When dragging an edge, how much to set it off left and top. */
         edgeOffset: 10,
         /** How much padding to use when applying an automatic graph layout. */
         graphPadding: 40
      },

      pathing: {
         /** Length of the horizontal connection stubs where links are attached to ports or edges. */
         stubLength: 20,
         /** Size of the path arrow head. */
         arrowHeadLength: 3,
         /** Smoothness at path turning points. */
         curvePadding: 8
      },

      async: {
         /** Fixup delay after a ui-triggered operation to ensure eventual consistency with ui state. */
         fixupDelay: 20,
         /** Debounce delay to throttle (expensive) operations e.g. during drag/drop */
         uiThrottleDelay: 3
      }

   };

} );
