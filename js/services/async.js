/**
 * Dagre-based graph layout service.
 * Edges and vertices are fed to dagre layouter as nodes, and links are fed as edges.
 */
define( [
   'underscore'
],
function ( underscore ) {
   'use strict';

   function Async( $window, $timeout, nbeAsyncSettings ) {

      var fixupDelayMs = nbeAsyncSettings.fixupDelay;
      var debounceDelayMs = nbeAsyncSettings.uiThrottleDelay;

      this.repeatAfter = repeatAfter;
      this.ensure = ensure;
      this.runEventually = runEventually;

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function repeatAfter( f, delayMs ) {
         delayMs = delayMs || fixupDelayMs;
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
         return repeatAfter( underscore.debounce( f, delayMs || debounceDelayMs ), delayMs || fixupDelayMs );
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      /**
       * Takes a function that tries to perform some initialization at least once.
       * If the function returns true, the initialization was successful and no further attempts are made.
       * If the return value is falsy, another attempt is scheduled.
       *
       * @param tryRun
       *   A function that attempts some initialization.
       * @param {Scope=} scope
       *   If set, $digest is called on this scope after successful initialization.
       *
       * @param intervalMs
       *   The retry frequency for the initialization code.
       */
      function runEventually( tryRun, scope, intervalMs ) {
         var initTimeout = $window.setTimeout( retry, 0 );
         function retry() {
            var success = tryRun();
            if ( !success ) {
               initTimeout = $window.setTimeout( retry, intervalMs || fixupDelayMs );
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
         module.service( 'nbeAsync', [ '$window', '$timeout', 'nbeAsyncSettings', Async ] );
      }
   };

} );