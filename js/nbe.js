require( ["underscore", "jquery", "jquery.ui"], function( _, $ ) {

   var model = {
      links: { },
      vertices: { },
      edges: { }
   }

   $(".graph .node").draggable( { stack: ".graph *", containment: "parent" } )

   function setUpPorts() {

      var PORT_CLASS_IN = 'in', PORT_CLASS_OUT = 'out';

      var $node;

      var dragFrom = { };

      function handleDragStart( event, ui ) {
         $node =  ui.helper.offsetParent();

         var nodePos = $node.position();
         var $port = $(event.target);
         var $portGroup = $port.parent().parent();
         var portClass = $portGroup.hasClass( PORT_CLASS_IN ) ? PORT_CLASS_IN : PORT_CLASS_OUT;
         console.log( portClass );
         if ( portClass === PORT_CLASS_OUT ) {

         }

         // setup initial drag offset to draw the link
         var portPos = $port.position();
         dragFrom.left = nodePos.left + portPos.left;
         dragFrom.top = nodePos.top + portPos.top;

         console.log( "graph offset:", dragFrom.left, dragFrom.top );



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

      $( '.port i' ).draggable( { opacity: 0.8, helper: "clone", zIndex: 100000, start: handleDragStart } );
   }

   setUpPorts();

} );
