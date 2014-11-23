define( [
   'angular',
   'nbe',
   'logic'
], function start( ng, nbe, logic ) {
   'use strict';

   console.log( 'logic', logic );
   ng.bootstrap( document, [ 'logic-circuit' ] );

} );
