define( [
   'underscore',
   'jquery',
   'jquery.ui',
   'angular',
   'directives/graph',
   'directives/edge',
   'directives/vertex',
   'directives/link',
   'directives/port',
   'dummy_data'
],
function (
   _,
   $,
   jqueryUi,
   ng,
   graphDirective,
   edgeDirective,
   vertexDirective,
   linkDirective,
   portDirective,
   data,
   undefined ) {
   'use strict';

   var module = ng.module( 'GraphWidget', [ ] );

   //////////////////////////////////////////////////////////////////////////////////////////////////////////

   function GraphWidget( $scope ) {
      var model = $scope.model = data.get( 'dummyModel' );
      var layout = $scope.layout = data.get( 'dummyLayout' );
      var view = $scope.view = { };
   }

   GraphWidget.$inject = [ '$scope' ];

   module.controller( 'GraphWidget', GraphWidget );

   //////////////////////////////////////////////////////////////////////////////////////////////////////////

   graphDirective.define( module );
   edgeDirective.define( module );
   vertexDirective.define( module );
   linkDirective.define( module );
   portDirective.define( module );

   //////////////////////////////////////////////////////////////////////////////////////////////////////////

   return module;

} );
