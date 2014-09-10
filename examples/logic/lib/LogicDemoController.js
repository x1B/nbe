define( [
   'jquery',
   'angular',
   './logic_circuit_editor',
   './circuit_simulator',
   'json!./data/primitives.json',
   'json!./data/dummy_model.json',
   'json!./data/dummy_layout.json'
], function( $, ng, logicCircuitEditorDirective, circuitSimulator, primitives, dummyModel, dummyLayout ) {
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

      $scope.closeEditor = function() {
         console.log(
            'Closing editor, component:',
            $scope.view.currentComponentId,
            '\n Model:',
            JSON.stringify( $scope.model.components[ $scope.view.currentComponentId ] ),
            '\n Layout:',
            JSON.stringify( $scope.layout.components[ $scope.view.currentComponentId ] ) );

         $scope.view.currentComponentId = null;
      };

      $scope.createComponent = function() {
         var id = $scope.view.newComponentId;
         $scope.model.components[ id ] = ng.copy( primitives.COMPONENT );
         $scope.view.currentComponentId = id;
         $scope.view.newComponentId = null;
      };


      function log( msg ) {
         $scope.messages.push( msg );
      }

      $scope.run = function() {
         var flatModel = $scope.view.flattened.model = { vertices: {}, edges: {} };
         $scope.view.flattened.layout = { vertices: {}, edges: {} };
         flattenTo( flatModel, $scope.model.main, [] );
         console.log( 'flatModel: ', flatModel );

         $scope.messages.splice( 0, $scope.messages.length );
         var sim = circuitSimulator( instantScheduler(), settings, log, $scope.model.components );
         $scope.$evalAsync( function() {
            sim.run( flatModel );
         } );
      };


      function flattenTo( result, circuit, ancestors ) {

         Object.keys( circuit.edges ).forEach( function( edgeId ) {
            result.edges[ qualify( edgeId ) ] = ng.copy( circuit.edges[ edgeId ] );
         } );

         // connect internal interface edges to their external edges:
         if( ancestors.length ) {
            var placeholder = ancestors[ ancestors.length - 1 ].vertex;
            [ 'INPUT', 'OUTPUT' ].forEach( function( iface ) {
               var bridge = ng.copy( circuit.vertices[ iface ] );
               bridge.label = 'BRIDGE';
               bridge.classes = 'interface';
               var internal = iface === 'INPUT' ? 'outbound' : 'inbound';
               var external = iface === 'INPUT' ? 'inbound' : 'outbound';
               bridge.ports[ external ] = ng.copy( placeholder.ports[ external ] );
               qualifyPorts( bridge.ports[ internal ] );
               result.vertices[ qualify( iface ) ] = bridge;
            } );
         }

         Object.keys( circuit.vertices ).forEach( function( vertexId ) {
            var sourceVertex = circuit.vertices[ vertexId ];
            var stackEntry = { vertex: sourceVertex, id: vertexId };
            var component = componentOf( sourceVertex );
            if( component && !ancestors.some( sameComponent( sourceVertex ) ) ) {
               flattenTo( result, component, ancestors.concat( [ stackEntry ] ) );
            }
            else if( sourceVertex.label !== 'INPUT' && sourceVertex.label !== 'OUTPUT' ) {
               // vertex represents a primitive (gate or signal):
               var copy = ng.copy( sourceVertex );
               qualifyPorts( copy.ports.inbound );
               qualifyPorts( copy.ports.outbound );
               result.vertices[ qualify( vertexId ) ] = copy;
            }
         } );

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         function qualify( id ) {
            return ancestors.map( function( _ ) { return _.id; } ).concat( [ id ] ).join( '/' );
         }

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         function qualifyPorts( portGroup ) {
            portGroup.forEach( function( port ) {
               port.edgeId = qualify( port.edgeId );
            } );
         }

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         function sameComponent( vertex ) {
            return function( stackEntry ) {
               return stackEntry.vertex.label === vertex.label;
            };
         }

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         function componentOf( vertex ) {
            return $scope.model.components[ vertex.label ];
         }
      }

   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   module.controller( 'LogicDemoController', [ '$scope', 'nbeIdGenerator', LogicDemoController ] );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   return module;


   function workItem( time, action ) {
      return { time: time, action: action };
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function instantScheduler() {
      var agenda = [];
      var t = 0;

      function next() {
         var item = agenda.shift();
         t = item.time;
         item.action();
      }

      function schedule( delay ) {
         return function( action ) {
            var at = t + ( delay || 0 );
            var i = agenda.length - 1;
            while( i >= 0 && agenda[ i ].time >= at ) {
               --i;
            }
            agenda.splice( i + 1, 0, workItem( at, action ) );
         };
      }

      return {
         schedule: schedule,
         now: function() {
            return t;
         },
         run: function() {
            while( agenda.length ) {
               next();
            }
         }
      };
   }

} );
