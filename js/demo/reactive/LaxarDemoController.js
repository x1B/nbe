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

   var module = ng.module( 'LaxarDemoApp', [ 'nbe' ] );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function LaxarDemoController( $scope ) {
      $scope.model = dummyModel;
      $scope.layout = dummyLayout;
      $scope.types = {
         RESOURCE: {
            maxSources: 1,
            hidden: false,
            label: 'Resources'
         },
         CONTAINER: {
            maxSources: 1,
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

   LaxarDemoController.$inject = [ '$scope', 'nbeAutoLayout' ];

   module.controller( 'LaxarDemoController', LaxarDemoController );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   return module;

} );
