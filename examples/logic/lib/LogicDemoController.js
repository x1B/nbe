define( [
   'jquery',
   'angular',
   './logic_circuit_editor',
   'json!./data/primitives.json',
   'json!./data/dummy_model.json',
   'json!./data/dummy_layout.json'
], function( $, ng, logicCircuitEditorDirective, primitives, dummyModel, dummyLayout ) {
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
         inverterDelay: 1,
         andGateDelay: 3,
         xorGateDelay: 4,
         orGateDelay: 5
      };

      $scope.$watch( 'view.currentComponentId', function( newId ) {
         if( !newId ) {
            $scope.view.editorOpen = false;
         }
      } );

      $scope.view = {
         currentComponentId: null,
         newComponentId: null
      };


      $scope.openEditor = function() {
         $scope.view.editorOpen = true;
      };

      $scope.closeEditor = function() {
         $scope.view.editorOpen = false;

         console.log(
            'Closing editor, component:',
            $scope.view.currentComponentId,
            '\n Model:',
            JSON.stringify( $scope.model.components[ $scope.view.currentComponentId ] ),
            '\n Layout:',
            JSON.stringify( $scope.layout.components[ $scope.view.currentComponentId ] ) );
      };

      $scope.createComponent = function() {
         $scope.model.components[ $scope.view.newComponentId ] = {
            edges: {},
            vertices: {
               INPUT: {
                  classes: 'adapter'
               },
               OUTPUT: {
                  classes: 'adapter'
               }
            }
         };
      };


      function log( msg ) {
         $scope.messages.push( msg );
      }

      $scope.run = function() {
         $scope.messages.splice( 0, $scope.messages.length );
         var sim = circuitSimulator( instantTimeSimulator(), settings, log );
         $scope.$evalAsync( function() {
            sim.run( $scope.model.main );
         } );
      };

   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   module.controller( 'LogicDemoController', [ '$scope', 'nbeIdGenerator', LogicDemoController ] );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   return module;


   function workItem( time, action ) {
      return { time: time, action: action };
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function instantTimeSimulator() {
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

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function circuitSimulator( sim, settings, log ) {

      var connectionBuilders = {

         /**
          * Channels are similar to wires:
          * They connect vertices, and are represented by edges in the digraph model.
          * However, they are stateless and simply transmit any message sent over them to all connected
          * receivers.
          */
         CHANNEL: function channel( id ) {
            var receivers = [];
            return {
               send: function( message ) {
                  receivers.forEach( function( _ ) {
                     _( message );
                  } );
               },
               onMessage: function( receive ) {
                  receivers.push( receive );
               },
               id: id
            };
         },

         /**
          * Wires are the stateful entities in the circuit simulation.
          * In the digraph model, wires are represented by edge nodes.
          *
          * Wires carry a signal (true or false for current/no current).
          * They connect to subsequent wires at gates by running the target gates' actions whenever their
          * own signal has changed.
          */
         WIRE: function wire( id ) {
            var signal = false;
            var actions = [];

            return {
               set: function( s ) {
                  if( s !== signal ) {
                     signal = s;
                     actions.forEach( function( _ ) {
                        _();
                     } );
                  }
               },
               get: function() {
                  return signal;
               },
               onChange: function( a ) {
                  actions.push( a );
                  a();
               },
               id: id
            };
         }
      };

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      /**
       * Gates are operations in the circuit simulation.
       * In the digraph model, gates are represented by vertex nodes.
       */
      var gateBuilders = {

         TRUE: function constant( outputWire ) {
            if( outputWire ) {
               sim.schedule()( function() {
                  outputWire.set( true );
               } );
            }
         },

         FALSE: function constant( outputWire ) {
            if( outputWire ) {
               sim.schedule()( function() {
                  outputWire.set( false );
               } );
            }
         },

         NOT: function inverter( inputWire, outputWire ) {
            if( inputWire && outputWire ) {
               inputWire.onChange( function() {
                  sim.schedule( settings.inverterDelay )( function() {
                     outputWire.set( !inputWire.get() );
                  } );
               } );
            }
         },

         AND: function andGate( aWire, bWire, outputWire ) {
            function react() {
               sim.schedule( settings.andGateDelay )( function() {
                  outputWire.set( aWire.get() && bWire.get() );
               } );
            }

            if( aWire && bWire && outputWire ) {
               aWire.onChange( react );
               bWire.onChange( react );
            }
         },

         OR: function orGate( aWire, bWire, outputWire ) {
            function react() {
               sim.schedule( settings.orGateDelay )( function() {
                  outputWire.set( aWire.get() || bWire.get() );
               } );
            }

            if( aWire && bWire && outputWire ) {
               aWire.onChange( react );
               bWire.onChange( react );
            }
         },

         LOG: function display( inputChannel ) {
            if( inputChannel ) {
               inputChannel.onMessage( log );
            }
         },

         PROBE: function probe( label, wire, debugChannel ) {
            if( wire && debugChannel ) {
               wire.onChange( function() {
                  sim.schedule( settings.probeDelay )( function() {
                     debugChannel.send( '@' + sim.now() + ': ' + label + ' becomes ' + wire.get() );
                  } );
               } );
            }
         }
      };

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function run( model ) {
         var connections = {};

         Object.keys( model.edges ).forEach( function( edgeId ) {
            connections[ edgeId ] = connectionBuilders[ model.edges[ edgeId ].type ]( edgeId );
         } );

         Object.keys( model.vertices ).forEach( function( vertexId ) {
            var vertex = model.vertices[ vertexId ];
            var wIn = vertex.ports.inbound.filter( isConnected ).filter( isWire ).map( connectionAt );
            var wOut = vertex.ports.outbound.filter( isConnected ).filter( isWire ).map( connectionAt );
            var cIn = vertex.ports.inbound.filter( isConnected ).filter( isChannel ).map( connectionAt );
            var cOut = vertex.ports.outbound.filter( isConnected ).filter( isChannel ).map( connectionAt );

            if( vertex.label.indexOf( 'PROBE ' ) === 0 ) {
               gateBuilders.PROBE.apply( this, [ vertex.label ].concat( wIn ).concat( cOut ) );
               return;
            }
            gateBuilders[ vertex.label ].apply( this, wIn.concat( wOut ).concat( cIn ).concat( cOut ) );
         } );

         sim.run();

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         function isWire( port ) {
            return port.type === 'WIRE';
         }

         function isChannel( port ) {
            return port.type === 'CHANNEL';
         }

         function isConnected( port ) {
            return !!port.edgeId;
         }

         function connectionAt( port ) {
            return connections[ port.edgeId ];
         }
      }

      return {
         run: run
      };
   }


} );
