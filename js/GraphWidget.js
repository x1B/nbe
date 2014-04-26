define( [
   'jquery',
   'angular',
   'directives/graph',
   'directives/edge',
   'directives/vertex',
   'directives/link',
   'directives/port',
   'json!../data/dummy_model.json',
   'json!../data/dummy_layout.json'
],
function (
   $,
   ng,
   graphDirective,
   edgeDirective,
   vertexDirective,
   linkDirective,
   portDirective,
   dummyModel,
   dummyLayout ) {
   'use strict';

   var module = ng.module( 'GraphWidget', [ ] );

   //////////////////////////////////////////////////////////////////////////////////////////////////////////

   function GraphWidget( $scope ) {
      var model = $scope.model = dummyModel;
      var layout = $scope.layout = dummyLayout;
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
