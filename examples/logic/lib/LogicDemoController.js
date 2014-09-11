define( [
   'jquery',
   'angular',
   './logic_circuit_editor',
   './flatten',
   './circuit_simulator',
   './scheduler',
   'json!./data/primitives.json',
   'json!./data/dummy_model.json',
   'json!./data/dummy_layout.json'
], function( $, ng, logicCircuitEditorDirective, flatten, simulator, scheduler, primitives, dummyModel, dummyLayout ) {
   'use strict';

   var module = ng.module( 'LogicDemoApp', [ 'nbe' ] );
   logicCircuitEditorDirective.define( module );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function LogicDemoController( $scope ) {

      $scope.primitives = primitives;
      $scope.model = dummyModel;
      $scope.layout = dummyLayout;
      $scope.messages = [];

      var settings = {
         probeDelay: 0,
         bridgeDelay: 0,
         inverterDelay: 1,
         andGateDelay: 3,
         orGateDelay: 5
      };

      $scope.view = {
         currentComponentId: null,
         newComponentId: null,
         flattened: {
            model: {},
            layout: {}
         }
      };

      $scope.closeEditor = function () {
         console.log(
            'Closing editor, component:',
            $scope.view.currentComponentId,
            '\n Model:',
            JSON.stringify( $scope.model.components[ $scope.view.currentComponentId ] ),
            '\n Layout:',
            JSON.stringify( $scope.layout.components[ $scope.view.currentComponentId ] ) );

         $scope.view.currentComponentId = null;
      };

      $scope.createComponent = function () {
         var id = $scope.view.newComponentId;
         $scope.model.components[ id ] = ng.copy( primitives.COMPONENT );
         $scope.view.currentComponentId = id;
         $scope.view.newComponentId = null;
      };

      $scope.run = function () {
         var flatModel = flatten( $scope.model.main ).using( $scope.model.components );
         $scope.view.flattened.layout = { vertices: {}, edges: {} };
         $scope.view.flattened.model = flatModel;

         $scope.messages.splice( 0, $scope.messages.length );
         var sim = simulator( scheduler.instant(), settings, log, $scope.model.components );
         $scope.$evalAsync( function () {
            sim.run( flatModel );
         } );

         function log( msg ) {
            $scope.messages.push( msg );
         }
      };

   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   module.controller( 'LogicDemoController', [ '$scope', 'nbeIdGenerator', LogicDemoController ] );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   return module;

} );
