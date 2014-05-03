define( [
   'angular',
   './nbe',
   'demo/logic/LogicDemoController',
   'demo/reactive/LaxarDemoController'
], function start( ng ) {
   'use strict';

   ng.bootstrap( document, [ 'LogicDemoApp', 'LaxarDemoApp' ] );

} );
