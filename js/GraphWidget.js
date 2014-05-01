define( [
   'jquery',
   'angular',
   'services/auto-layout',
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
   autoLayoutService,
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
      $scope.model = dummyModel;
      $scope.layout = dummyLayout;
   }

   //////////////////////////////////////////////////////////////////////////////////////////////////////////

   autoLayoutService.define( module );
   graphDirective.define( module );
   edgeDirective.define( module );
   vertexDirective.define( module );
   linkDirective.define( module );
   portDirective.define( module );

   GraphWidget.$inject = [ '$scope', 'nbeAutoLayout' ];

   module.controller( 'GraphWidget', GraphWidget );

   //////////////////////////////////////////////////////////////////////////////////////////////////////////

   return module;

} );
