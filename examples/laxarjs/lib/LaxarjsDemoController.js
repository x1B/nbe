define( [
   '../../../bower_components/jquery/dist/jquery',
   'angular',
   'json!./data/dummy_model.json',
   'json!./data/dummy_layout.json'
],
function (
   $,
   ng,
   dummyModel,
   dummyLayout ) {
   'use strict';

   var module = ng.module( 'LaxarjsDemoApp', [ 'nbe' ] );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function LaxarjsDemoController( $scope ) {
      $scope.model = dummyModel;
      $scope.layout = dummyLayout;
      $scope.types = {
         RESOURCE: {
            maxSources: 1,
            simple: true,
            hidden: false,
            label: 'Resources'
         },
         CONTAINER: {
            maxSources: 1,
            simple: true,
            hidden: false,
            label: 'Nesting'
         },
         FLAG: {
            label: 'Flags',
            hidden: false
         },
         ACTION: {
            label: 'Actions',
            hidden: false
         }
      };
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   module.controller( 'LaxarjsDemoController', [ '$scope', 'nbeAutoLayout', LaxarjsDemoController ] );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   return module;

} );
