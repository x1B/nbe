define( [
   'jquery',
   'angular',
   'json!./data/dummy_model.json',
   'json!./data/dummy_layout.json'
], function( $, ng, dummyModel, dummyLayout ) {
   'use strict';

   var module = ng.module( 'NukeDemoApp', [ 'nbe' ] );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function NukeDemoController( $scope, $timeout ) {
      $scope.model = dummyModel;
      $scope.layout = dummyLayout;
      // $scope.layout = { edges: {}, vertices: {} };
      // $timeout( function() {
      // $scope.nbeController.calculateLayout()
      // } );
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   module.controller( 'NukeDemoController', [ '$scope', '$timeout', NukeDemoController ] );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   return module;

} );
