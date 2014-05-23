define( [
   'jquery',
   'angular',
   'json!./data/dummy_model.json',
   'json!./data/dummy_layout.json'
], function( $, ng, dummyModel, dummyLayout ) {
   'use strict';

   var module = ng.module( 'FfmpegDemoApp', [ 'nbe' ] );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function FfmpegDemoController( $scope, $timeout ) {
      $scope.model = dummyModel;
      $scope.layout = dummyLayout;
      $scope.addFilter = function( filterId ) {

      };

      $scope.availableFilters = [ 'FilterA ', 'FilterB', 'FilterC' ];

      // $scope.layout = { edges: {}, vertices: {} };
      // $timeout( function() {
      // $scope.nbeController.calculateLayout()
      // } );
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   module.controller( 'FfmpegDemoController', [ '$scope', '$timeout', FfmpegDemoController ] );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   return module;

} );
