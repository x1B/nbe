define( [], function() {
   'use strict';

   return function( viewModel, jqGraph, $document, ops, graphOperationsController, dragDropController ) {

      var KEY_CODE_DELETE = 46;
      var KEY_CODE_C = 67;
      var KEY_CODE_V = 86;
      var KEY_CODE_X = 88;
      var KEY_CODE_Y = 89;
      var KEY_CODE_Z = 90;
      var KEY_CODE_ESCAPE = 0x1B;

      jqGraph.on( 'focusin', function() {
         $document.on( 'keydown', handleKeys );
         viewModel.hasFocus = true;
      } );

      jqGraph.on( 'focusout', function() {
         $document.off( 'keydown', handleKeys );
         viewModel.hasFocus = false;
      } );

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
            else if( event.keyCode === KEY_CODE_C ) {
               console.log( 'TODO: copy' );
            }
            else if( event.keyCode === KEY_CODE_X ) {
               console.log( 'TODO: cut' );
            }
            else if( event.keyCode === KEY_CODE_V ) {
               console.log( 'TODO: paste' );
            }
         }
      }

   };

} );
