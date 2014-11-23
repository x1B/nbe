define( [
   'jquery',
   'angular',
   './logic_circuit_editor',
   './flatten',
   './circuit_simulator',
   './scheduler',
   'json!logic/data/primitives.json',
   'json!logic/data/dummy_model.json',
   'json!logic/data/dummy_layout.json',
   'text!logic/logic_demo.html'
], function( $, ng, lcEditorDirective, flatten, simulator, scheduler, primitives, dummyModel, dummyLayout, htmlDemoTemplate ) {
   'use strict';

   var module = ng.module( 'logic-circuit', [ 'nbe' ] );
   module.run( [ '$templateCache', function( $templateCache ) {
      $templateCache.put( 'lib/logic_demo.html', htmlDemoTemplate );
   } ] );

   lcEditorDirective.define( module );

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
            show: false,
            model: {},
            layout: {}
         }
      };

      $scope.closeEditor = function () {
         $scope.view.currentComponentId = null;
      };

      $scope.createComponent = function () {
         var id = $scope.view.newComponentId;
         $scope.model.components[ id ] = ng.copy( primitives.COMPONENT );
         $scope.view.currentComponentId = id;
         $scope.view.newComponentId = null;
      };

      $scope.flatten = function () {
         var flatModel = flatten( $scope.model.main ).using( $scope.model.components );
         $scope.view.flattened.layout = null;
         $scope.view.flattened.model = flatModel;
         $scope.view.flattened.show = true;
      };

      $scope.run = function () {
         $scope.messages.splice( 0, $scope.messages.length );
         var sim = simulator( scheduler.instant(), settings, log, $scope.model.components );
         $scope.$evalAsync( function () {
            sim.run( $scope.view.flattened.model );
         } );

         function log( msg ) {
            $scope.messages.push( msg );
         }
      };

      $scope.$watch( 'model', function() {
         // reset flattened representation
         $scope.view.flattened.layout = null;
         $scope.view.flattened.model = null;
         $scope.view.flattened.show = false;
         $scope.messages = [];
      }, true );


      $scope.$on( 'lc.interface.added', function( event, iface, port ) {
         forEachInstance( $scope.view.currentComponentId, function( instanceVertex ) {
            instanceVertex.ports[ iface === 'INPUT' ? 'inbound' : 'outbound' ].push( ng.copy( port ) );
         } );
      } );

      $scope.$on( 'lc.interface.removed', function( event, iface ) {
         forEachInstance( $scope.view.currentComponentId, function( instanceVertex ) {
            instanceVertex.ports[ iface === 'INPUT' ? 'inbound' : 'outbound' ].pop();
         } );
      } );

      function forEachInstance( searchId, callback ) {
         handle( $scope.model.main );
         ng.forEach( $scope.model.components, handle );
         function handle( circuit ) {
            ng.forEach( circuit.vertices, function( vertex, id ) {
               if( vertex.label === searchId ) {
                  callback( vertex );
               }
            } );
         }
      }

   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   module.controller( 'LogicDemoController', [ '$scope', 'nbeIdGenerator', LogicDemoController ] );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   return module;

} );
