define( [
   'jquery',
   'angular',
   'json!./dummy_model.json',
   'json!./dummy_layout.json'
],
function (
   $,
   ng,
   dummyModel,
   dummyLayout ) {
   'use strict';

   var module = ng.module( 'LogicDemoApp', [ 'nbe' ] );

   //////////////////////////////////////////////////////////////////////////////////////////////////////////

   function LogicDemoController( $scope ) {
      $scope.circuit = dummyModel;
      $scope.layout = dummyLayout;
   }

   //////////////////////////////////////////////////////////////////////////////////////////////////////////

   LogicDemoController.$inject = [ '$scope', 'nbeAutoLayout' ];

   module.controller( 'LogicDemoController', LogicDemoController );

   //////////////////////////////////////////////////////////////////////////////////////////////////////////

   return module;

} );
