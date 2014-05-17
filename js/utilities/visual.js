define( [], function () {
   'use strict';

   /**
    * Calculate a bounding box of graph-relative coordinates for a given dom node.
    * @param jqNode
    *   A vertex node ob, wrapped in a jQuery.
    * @param jqGraph
    * @param box
    */
   function boundingBox( jqNode, jqGraph, box ) {
      var v = jqNode.offset();
      var graphOffset = jqGraph.offset();
      var top = v.top - graphOffset.top;
      var left = v.left - graphOffset.left;
      box = box || {};
      box.top = top;
      box.left = left;
      box.right = left + jqNode.width();
      box.bottom = top + jqNode.height();
      return box;
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function runAnimation( jqElement, animation ) {
      animation = animation || 'ping';
      var events = 'animationend webkitAnimationEnd oAnimationEnd';
      jqElement.on( events, cleanup );
      jqElement.addClass( animation );
      function cleanup() {
         jqElement.removeClass( animation );
         jqElement.on( events, cleanup );
      }
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   return {
      boundingBox: boundingBox,
      pingAnimation: runAnimation
   };

} );
