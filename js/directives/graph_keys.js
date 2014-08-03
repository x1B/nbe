define( [], function() {
   'use strict';

   return function( $document, ops, graphOperationsController, dragDropController ) {

      var KEY_CODE_DELETE = 46;
      var KEY_CODE_Y = 89;
      var KEY_CODE_Z = 90;
      var KEY_CODE_ESCAPE = 0x1B;

      $document.on( 'keydown', handleKeys );

      return {};

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function handleKeys( event ) {
         if( event.keyCode === KEY_CODE_DELETE ) {
            ops.perform( graphOperationsController.deleteSelected() );
         }
         else if( event.keyCode === KEY_CODE_ESCAPE ) {
            if( dragDropController.transaction() ) {
               dragDropController.cancel();
            }
         }
         else if( event.metaKey || event.ctrlKey ) {
            if( event.keyCode === KEY_CODE_Z ) {
               if( event.shiftKey ) {
                  ops.redo();
               }
               else {
                  ops.undo();
               }
            }
            else if( event.keyCode === KEY_CODE_Y ) {
               ops.redo();
            }
         }
      }

   };

} );
