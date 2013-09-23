require(["underscore", "jquery", "jquery.ui"], function(_, $) {

   $(".graph .node").draggable( { stack: ".graph *" } )


   var $origin;

   function handleDragStart( event, ui ) {
      console.log( event, ui );

      // if this is an IN port:
      //    if there is no link here: stop.
      //    else: $origin = $link.sourcePort
      // else:
      //    if there is a $link with


      // , draw line from current OUT port to mouse

      // if this is an OUT port:
      // ... draw line from port to mouse


   }

   function updateLink( $link, fromX, fromY, toX, toY ) {

   }

   $(".port i").draggable( { opacity: 0.8, helper: "clone", zIndex: 100000, start: handleDragStart } );

});
