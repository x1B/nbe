/**
 * Dagre-based graph layout service.
 * Edges and vertices are fed to dagre layouter as nodes, and links are fed as edges.
 */
define( [], function() {
   'use strict';

   function Async( $window, $timeout, nbeAsyncSettings ) {

      var fixupDelayMs = nbeAsyncSettings.fixupDelay;
      var debounceDelayMs = nbeAsyncSettings.uiThrottleDelay;

      this.repeatAfter = repeatAfter;
      this.ensure = ensure;
      this.runEventually = runEventually;
      this.debounce = debounce;

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function repeatAfter( f, delayMs ) {
         delayMs = delayMs || fixupDelayMs;
         var handle;
         return function() {
            var args = arguments;
            var self = this;
            f.apply( self, args );
            if( handle ) {
               $timeout.cancel( handle );
            }
            handle = $timeout( function() {
               f.apply( self, args );
            }, delayMs );
         };
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function ensure( f, delayMs ) {
         return repeatAfter( debounce( f, delayMs || debounceDelayMs ), delayMs || fixupDelayMs );
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
            if( !success ) {
               initTimeout = $window.setTimeout( retry, intervalMs || fixupDelayMs );
            }
            else if( scope ) {
               scope.$digest();
            }
         }

         scope.$on( '$destroy', function() {
            if( initTimeout ) {
               $window.clearTimeout( initTimeout );
            }
         } );
      }

   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   /**
    * From underscore.js v1.5.2: https://github.com/jashkenas/underscore
    *
    * Copyright (c) 2009-2013 Jeremy Ashkenas, DocumentCloud and Investigative
    * Reporters & Editors
    *
    * Permission is hereby granted, free of charge, to any person
    * obtaining a copy of this software and associated documentation
    * files (the "Software"), to deal in the Software without
    * restriction, including without limitation the rights to use,
    * copy, modify, merge, publish, distribute, sublicense, and/or sell
    * copies of the Software, and to permit persons to whom the
    * Software is furnished to do so, subject to the following
    * conditions:
    *
    * The above copyright notice and this permission notice shall be
    * included in all copies or substantial portions of the Software.
    *
    * @param {Function} func
    *   the function to debounce
    * @param {Number} waitMs
    * @param {Boolean} immediate
    * @returns {Function}
    *   the debounced function
    */
   function debounce( func, waitMs, immediate ) {
      var timeout, args, context, timestamp, result;
      return function () {
         context = this;
         args = arguments;
         timestamp = new Date();
         var later = function () {
            var last = (new Date()) - timestamp;
            if ( last < waitMs ) {
               timeout = setTimeout( later, waitMs - last );
            } else {
               timeout = null;
               if ( !immediate ) {
                  result = func.apply( context, args );
               }
            }
         };
         var callNow = immediate && !timeout;
         if ( !timeout ) {
            timeout = setTimeout( later, waitMs );
         }
         if ( callNow ) {
            result = func.apply( context, args );
         }
         return result;
      };
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   return {
      define: function( module ) {
         module.service( 'nbeAsync', ['$window', '$timeout', 'nbeAsyncSettings', Async] );
      }
   };

} );