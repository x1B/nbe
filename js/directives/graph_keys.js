define( [], function() {
   'use strict';

   /** Maintain fake clipboard across instances if no system clipboard is available (use local storage?). */
   var fakeClipboard;

   return function( viewModel, jqGraph, $document, ops, graphOpsController, dragDropController, selectionController ) {

      var KEY_CODE_DELETE = 46;
      var KEY_CODE_C = 67;
      var KEY_CODE_V = 86;
      var KEY_CODE_X = 88;
      var KEY_CODE_Y = 89;
      var KEY_CODE_Z = 90;
      var KEY_CODE_ESCAPE = 0x1B;

      /**
       * If the user agent supports clipboard events, the cut/copy/paste handlers will be called twice after
       * the user has pressed Ctrl-X/C/V and only once if the user has used the browser menu. This flag makes
       * sure that each operation is carried out exactly once.
       */
      var clipboardPrepared = false;

      /** Make sure that bindings fire only once. */
      var focusHandlersInstalled = false;

      jqGraph.on( 'focusin', function() {
         viewModel.hasFocus = true;
         if( !focusHandlersInstalled ) {
            $document.on( 'keydown', handleKeys );
            $document[0].body.addEventListener( 'copy', handleCopy );
            $document[0].body.addEventListener( 'cut', handleCut );
            focusHandlersInstalled = true;
         }
      } );

      jqGraph.on( 'focusout', function() {
         $document.off( 'keydown', handleKeys );
         $document[0].body.removeEventListener( 'copy', handleCopy );
         $document[0].body.removeEventListener( 'cut', handleCut );
         focusHandlersInstalled = viewModel.hasFocus = false;
      } );

      return {};

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function handleCopy( event ) {
         if( !clipboardPrepared ) {
            copySelectionToClipboard();
         }
         event.clipboardData.setData( 'application/json', fakeClipboard );
         event.clipboardData.setData( 'text/plain', fakeClipboard );
         event.preventDefault();
         clipboardPrepared = false;
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function handleCut( event ) {
         if( !clipboardPrepared ) {
            copySelectionToClipboard();
            ops.perform( graphOpsController.deleteSelected() );
         }
         event.clipboardData.setData( 'application/json', fakeClipboard );
         event.clipboardData.setData( 'text/plain', fakeClipboard );
         event.preventDefault();
         clipboardPrepared = false;
      }

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
                  ops.perform( graphOpsController.insert( JSON.parse( fakeClipboard ) ) );
               }
            }
         }
      }

   };

} );
