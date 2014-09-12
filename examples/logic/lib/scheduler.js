define( [], function() {
   'use strict';

   return {
      instant: instantScheduler
   };

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function workItem( time, action ) {
      return { time: time, action: action };
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function instantScheduler() {
      var agenda = [];
      var t = 0;

      function next() {
         var item = agenda.shift();
         t = item.time;
         item.action();
      }

      function schedule( delay ) {
         return function( action ) {
            var at = t + ( delay || 0 );
            var i = agenda.length - 1;
            while( i >= 0 && agenda[ i ].time >= at ) {
               --i;
            }
            agenda.splice( i + 1, 0, workItem( at, action ) );
         };
      }

      return {
         schedule: schedule,
         now: function() {
            return t;
         },
         run: function() {
            while( agenda.length ) {
               next();
            }
         }
      };
   }

} );
