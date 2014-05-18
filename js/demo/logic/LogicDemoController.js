define( [
   'jquery',
   'angular',
   'json!./templates.json',
   'json!./dummy_model.json',
   'json!./dummy_layout.json'
], function( $, ng, templates, dummyModel, dummyLayout ) {
   'use strict';

   var module = ng.module( 'LogicDemoApp', [ 'nbe' ] );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function LogicDemoController( $scope, nbeIdGenerator ) {
      $scope.circuit = dummyModel;
      $scope.layout = dummyLayout;
      $scope.messages = [];

      var settings = {
         probeDelay: 0,
         inverterDelay: 1,
         andGateDelay: 3,
         xorGateDelay: 4,
         orGateDelay: 5
      };

      function log( msg ) {
         $scope.messages.push( msg );
      }

      $scope.run = function() {
         $scope.messages.splice( 0, $scope.messages.length );
         var sim = circuitSimulator( instantTimeSimulator(), settings, log );
         $scope.$evalAsync( function() {
            sim.run( $scope.circuit );
         } );
      };

      var gateIdGenerator = nbeIdGenerator.create( [ 'v' ], $scope.circuit.vertices );
      $scope.addGate = function( gateType ) {
         var id = gateIdGenerator();
         var gate = ng.copy( templates.model[ gateType  ] );
         $scope.circuit.vertices[ id ] = gate;
         $scope.layout.vertices[ id ] = ng.copy( templates.layout );
      };
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   LogicDemoController.$inject = [ '$scope', 'nbeIdGenerator' ];

   module.controller( 'LogicDemoController', LogicDemoController );

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

         PROBE: function probe( wire, debugChannel ) {
            if( wire && debugChannel ) {
               wire.onChange( function() {
                  sim.schedule( settings.probeDelay )( function() {
                     debugChannel.send( '@' + sim.now() + ': ' + wire.id + ' becomes ' + wire.get() );
                  } );
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

         XOR: function xorGate( aWire, bWire, outputWire ) {
            function react() {
               sim.schedule( settings.xorGateDelay )( function() {
                  outputWire.set( aWire.get() ? !bWire.get() : bWire.get() );
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
            var activePorts = vertex.ports.filter( isConnected );
            var wIn = activePorts.filter( isInput ).filter( isWire ).map( connectionAt );
            var wOut = activePorts.filter( isOutput ).filter( isWire ).map( connectionAt );
            var cIn = activePorts.filter( isInput ).filter( isChannel ).map( connectionAt );
            var cOut = activePorts.filter( isOutput ).filter( isChannel ).map( connectionAt );
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

         function isInput( port ) {
            return port.direction === 'in';
         }

         function isOutput( port ) {
            return port.direction !== 'in';
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
