define([], function () {

   function repeatAfter( f, $timeout, delay ) {
      delay = delay || 75;
      var handle;
      return function( event ) {
         f.apply( this, arguments );
         if( handle ) {
            $timeout.cancel( handle );
         }
         handle = $timeout( f, delay );
      }
   }

   return {
      repeatAfter: repeatAfter
   }

} );
