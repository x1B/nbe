/**
 * Dagre-based graph layout service.
 * Edges and vertices are fed to dagre layouter as nodes, and links are fed as edges.
 */
define( [
   'underscore'
],
function ( underscore ) {
   'use strict';


   function Async( $window, $timeout ) {

      this.repeatAfter = repeatAfter;
      this.ensure = ensure;
      this.runEventually = runEventually;

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function repeatAfter( f, delay ) {
         delay = delay || 50;
         var handle;
         return function() {
            var args = arguments;
            var self = this;
            f.apply( self, args );
            if ( handle ) {
               $timeout.cancel( handle );
            }
            handle = $timeout( function() { f.apply( self, args ); }, delay );
         };
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function ensure( f, t ) {
         return repeatAfter( underscore.debounce( f, t || 3 ), t || 10 );
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
               initTimeout = $window.setTimeout( retry, intervalMs || 10 );
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
         module.service( 'nbeAsync', [ $window, $timeout, Async ] );
      }
   };

} );