define( [], function() {
   'use strict';

   var fakeClipboard;

   return function( viewModel, jqGraph, $document, ops, graphOpsController, dragDropController, selectionController ) {

      var KEY_CODE_DELETE = 46;
      var KEY_CODE_C = 67;
      var KEY_CODE_V = 86;
      var KEY_CODE_X = 88;
      var KEY_CODE_Y = 89;
      var KEY_CODE_Z = 90;
      var KEY_CODE_ESCAPE = 0x1B;

      var clipboardPrepared = false;

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      jqGraph.on( 'focusin', function() {
         $document.on( 'keydown', handleKeys );
         viewModel.hasFocus = true;
      } );

      jqGraph.on( 'focusout', function() {
         $document.off( 'keydown', handleKeys );
         viewModel.hasFocus = false;
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      $document.on( 'copy', function( event ) {
         if( !clipboardPrepared ) {
            copySelectionToClipboard();
         }
         console.log( 'putting graph to clipboard: ', fakeClipboard );
         if( event.clipboardData ) {
            event.clipboardData.setData( 'application/json', fakeClipboard );
            event.clipboardData.setData( 'text/plain', fakeClipboard );
            event.preventDefault();
            clipboardPrepared = false;
         }
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      $document.on( 'cut', function( event ) {
         if( !clipboardPrepared ) {
            copySelectionToClipboard();
            ops.perform( graphOpsController.deleteSelected() );
         }
         if( event.clipboardData ) {
            event.clipboardData.setData( 'application/json', fakeClipboard );
            event.clipboardData.setData( 'text/plain', fakeClipboard );
            event.preventDefault();
         }
         clipboardPrepared = false;
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      return {};

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function copySelectionToClipboard() {
         fakeClipboard = JSON.stringify( selectionController.copy() );
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function handleKeys( event ) {
         if( event.keyCode === KEY_CODE_DELETE ) {
            ops.perform( graphOpsController.deleteSelected() );
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
               copySelectionToClipboard();
               clipboardPrepared = true;
            }
            else if( event.keyCode === KEY_CODE_X ) {
               copySelectionToClipboard();
               ops.perform( graphOpsController.deleteSelected() );
               clipboardPrepared = true;
            }
            else if( event.keyCode === KEY_CODE_V ) {
               if( fakeClipboard ) {
                  console.log( 'pasting', fakeClipboard );
                  ops.perform( graphOpsController.insert( JSON.parse( fakeClipboard ) ) );
               }
            }
         }
      }

   };

} );
