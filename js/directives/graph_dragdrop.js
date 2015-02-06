define( [], function() {
   'use strict';

   var IN = 'inbound', OUT = 'outbound';

   /**
    * Manages drag/drop of ports to create links or even new edges.
    *
    * @param {object} ops
    *    an operations stack that manages undoable transactions
    * @param {$} jqGraph
    *    a jQuery handle to the graph DOM
    */
   return function( ops, jqGraph ) {

      /** When port/link ghosts are dropped, the most recent drop target can be accessed here. */
      var dropRef;

      /** While a port is being dragged, it can be accessed here. */
      var dragRef;

      /** For undo/redo, operations of a single drag/drop interaction are grouped as a transaction. */
      var transaction;

      var onCancel;

      function clear() {
         jqGraph.removeClass( 'highlight-' + dragRef.port.type );
         jqGraph.removeClass( 'highlight-' + (dragRef.direction === IN ? OUT : IN) );
         dropRef = dragRef = transaction = null;
      }

      return {
         start: function( ref, cancel ) {
            onCancel = cancel;
            transaction = ops.startTransaction();
            dragRef = { nodeId: ref.nodeId, port: ref.port, direction: ref.direction };
            jqGraph.addClass( 'highlight-' + ref.port.type );
            jqGraph.addClass( 'highlight-' + (ref.direction === IN ? OUT : IN) );
            return transaction;
         },

         dropRef: function() {
            return dropRef;
         },

         transaction: function() {
            return transaction;
         },

         canConnect: function( dropRef ) {
            if( !dragRef || !dragRef.port ) {
               return false;
            }
            var result = dropRef.port ?
               ( dropRef.port.type === dragRef.port.type &&
                 dropRef.direction !== dragRef.direction ) :
               ( dropRef.edge.type === dragRef.port.type );

            return result;
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
      };
   };

} );
