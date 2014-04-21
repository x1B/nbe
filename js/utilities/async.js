define([], function () {

   function repeatAfter( f, $timeout, delay ) {
      delay = delay || 50;
      var handle;
      return function() {
         var args = arguments;
         var self = this;
         f.apply( self, args );
         if( handle ) {
            $timeout.cancel( handle );
         }
         handle = $timeout( function() { f.apply( self, args ) }, delay );
      }
   }

   return {
      repeatAfter: repeatAfter
   }

} );
