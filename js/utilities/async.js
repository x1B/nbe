define( [ 'underscore' ], function ( underscore ) {

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

   function ensure( f, $timeout, t ) {
      return repeatAfter( underscore.debounce( f, t || 3 ), $timeout, t || 10 );
   }

   return {
      ensure: ensure,
      repeatAfter: repeatAfter
   }

} );
