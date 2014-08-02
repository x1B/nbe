define( [], function() {
   'use strict';

   return function graphKeysController( selectionController, dragDropController, operations ) {

      function handleKeys( event ) {
         var KEY_CODE_DELETE = 46, KEY_CODE_Y = 89, KEY_CODE_Z = 90, KEY_CODE_ESCAPE = 0x1B;

         if ( event.keyCode === KEY_CODE_DELETE ) {
            selectionController.handleDelete();
         }
         else if ( event.keyCode === KEY_CODE_ESCAPE ) {
            if ( dragDropController.transaction() ) {
               dragDropController.cancel();
            }
         }
         else if ( event.metaKey || event.ctrlKey ) {
            if ( event.keyCode === KEY_CODE_Z ) {
               if ( event.shiftKey ) {
                  operations.redo();
               }
               else {
                  operations.undo();
               }
            }
            else if ( event.keyCode === KEY_CODE_Y ) {
               operations.redo();
            }
         }
      }

   };

} );
