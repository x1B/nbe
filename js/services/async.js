/**
 * Dagre-based graph layout service.
 * Edges and vertices are fed to dagre layouter as nodes, and links are fed as edges.
 */
define( [
   'underscore'
],
function ( underscore ) {
   'use strict';

   /** Fixup delay after a ui-event-based operation */
   var FIXUP_DELAY_MS = 20;
   /** Debounce delay to throttle expensive operations e.g. during drag/drop */
   var DEBOUNCE_DELAY_MS = 5;

   function Async( $window, $timeout ) {

      this.repeatAfter = repeatAfter;
      this.ensure = ensure;
      this.runEventually = runEventually;

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function repeatAfter( f, delayMs ) {
         delayMs = delayMs || FIXUP_DELAY_MS;
         var handle;
         return function() {
            var args = arguments;
            var self = this;
            f.apply( self, args );
            if ( handle ) {
               $timeout.cancel( handle );
            }
            handle = $timeout( function() { f.apply( self, args ); }, delayMs );
         };
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function ensure( f, delayMs ) {
         return repeatAfter( underscore.debounce( f, delayMs || DEBOUNCE_DELAY_MS ), delayMs || FIXUP_DELAY_MS );
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      /**
       * Takes a function that tries to perform some initialization at least once.
       * If the function returns true, the initialization was successful and no further attempts are made.
       * If the return value is falsy, another attempt is scheduled.
       *
       * @param tryRun A function that attempts some initialization.
       * @param window An (injected) window object.
       * @param {Scope=} scope If set, $digest is called on this scope after successful initialization.
       * @param intervalMs The retry frequency for the initialization code. Defaults to 10ms.
       */
      function runEventually( tryRun, scope, intervalMs ) {
         var initTimeout = $window.setTimeout( retry, 0 );
         function retry() {
            var success = tryRun();
            if ( !success ) {
               initTimeout = $window.setTimeout( retry, intervalMs || FIXUP_DELAY_MS );
            }
            else if ( scope ) {
               scope.$digest();
            }
         }
         scope.$on( '$destroy', function() {
            if ( initTimeout ) {
               $window.clearTimeout( initTimeout );
            }
         } );
      }

   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   return {
      define: function( module ) {
         module.service( 'nbeAsync', [ '$window', '$timeout', Async ] );
      }
   };

} );