define( [], function() {
   'use strict';

   /**
    * Manages drag/drop of ports to create links or even new edges.
    */
   return function( jqGraph, ops ) {

      /** When port/link ghosts are dropped, the most recent drop target can be accessed here. */
      var dropRef;

      /** While a port is being dragged, it can be accessed here. */
      var dragRef;

      /** For undo/redo, operations of a single drag/drop interaction are grouped as a transaction. */
      var transaction;

      var onCancel;

      function clear() {
         jqGraph.removeClass( 'highlight-' + dragRef.port.type );
         jqGraph.removeClass( 'highlight-' + ( dragRef.port.direction === 'in' ? 'out' : 'in' ) );
         dropRef = dragRef = transaction = null;
      }

      return Object.freeze( {
         start: function( ref, cancel ) {
            onCancel = cancel;
            transaction = ops.startTransaction();
            dragRef = { nodeId: ref.nodeId, port: ref.port };
            jqGraph.addClass( 'highlight-' + ref.port.type );
            jqGraph.addClass( 'highlight-' + ( ref.port.direction === 'in' ? 'out' : 'in' ) );
            return transaction;
         },

         dropRef: function() {
            return dropRef;
         },

         transaction: function() {
            return transaction;
         },

         setDropRef: function( ref ) {
            dropRef = ref;
         },

         finish: function() {
            if( transaction ) {
               transaction.commit();
               clear();
            }
         },

         cancel: function() {
            if( transaction ) {
               transaction.rollBack();
               clear();
               onCancel();
            }
         }
      } );
   };

} );
