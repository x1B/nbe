define( [], function () {
   'use strict';

   function boundingBox( jqNode, jqGraph, box ) {
      var v = jqNode.offset();
      var graphOffset = jqGraph.offset();
      var top = v.top - graphOffset.top;
      var left = v.left - graphOffset.left;
      box.top = top;
      box.left = left;
      box.right = left + jqNode.width();
      box.bottom = top + jqNode.height();
   }

   return {
      boundingBox: boundingBox,
      PORT_DRAG_OFFSET: 8,
      EDGE_DRAG_OFFSET: 15,
      GRAPH_PADDING: 40
   };

} );
