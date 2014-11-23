define( [
   'jquery',
   'angular',
   'json!nuke/data/dummy_model.json',
   'json!nuke/data/dummy_layout.json',
   'text!nuke/demo.html'
], function( $, ng, dummyModel, dummyLayout, htmlDemoTemplate ) {
   'use strict';

   var module = ng.module( 'NukeDemoApp', [ 'nbe' ] )
      .run( [ '$templateCache', function( $templateCache ) {
         $templateCache.put( 'lib/demo.html', htmlDemoTemplate );
      } ] );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function NukeDemoController( $scope, $timeout ) {
      $scope.model = dummyModel;
      $scope.layout = dummyLayout;
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   module.controller( 'NukeDemoController', [ '$scope', '$timeout', NukeDemoController ] );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   return module;

} );
