define( [
   'require',
   'angular',
   'GraphWidget'
], function start( require, ng ) {
   'use strict';

   require( [ 'domReady!' ], function handleDomReady( document ) {
      ng.bootstrap( document, [ 'GraphWidget' ] );
   } );

} );
