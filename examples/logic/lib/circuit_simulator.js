define( [], function() {
   'use strict';

   return function circuitSimulator( scheduler, settings, log ) {

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
               send: function ( message ) {
                  receivers.forEach( function ( _ ) {
                     _( message );
                  } );
               },
               onMessage: function ( receive ) {
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
               set: function ( s ) {
                  if ( s !== signal ) {
                     signal = s;
                     actions.forEach( function ( _ ) {
                        _();
                     } );
                  }
               },
               get: function () {
                  return signal;
               },
               onChange: function ( a ) {
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
               scheduler.schedule()( function () {
                  outputWire.set( true );
               } );
            }
         },

         FALSE: function constant( outputWire ) {
            if( outputWire ) {
               scheduler.schedule()( function () {
                  outputWire.set( false );
               } );
            }
         },

         NOT: function inverter( inputWire, outputWire ) {
            if( inputWire && outputWire ) {
               inputWire.onChange( function () {
                  scheduler.schedule( settings.inverterDelay )( function () {
                     outputWire.set( !inputWire.get() );
                  } );
               } );
            }
         },

         BRIDGE: function bridge( inputWire, outputWire ) {
            if( inputWire && outputWire ) {
               inputWire.onChange( function () {
                  scheduler.schedule( settings.bridgeDelay )( function () {
                     outputWire.set( inputWire.get() );
                  } );
               } );
            }
         },

         AND: function andGate( aWire, bWire, outputWire ) {
            function react() {
               scheduler.schedule( settings.andGateDelay )( function () {
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
               scheduler.schedule( settings.orGateDelay )( function () {
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
               wire.onChange( function () {
                  scheduler.schedule( settings.probeDelay )( function () {
                     debugChannel.send( '@' + scheduler.now() + ': ' + label + ' becomes ' + wire.get() );
                  } );
               } );
            }
         }

      };

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function run( model ) {

         var connections = {};
         Object.keys( model.edges ).forEach( instantiateEdge );
         Object.keys( model.vertices ).forEach( instantiateVertex );
         scheduler.run();

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         function instantiateEdge( edgeId ) {
            connections[ edgeId ] = connectionBuilders[ model.edges[ edgeId ].type ]( edgeId );
         }

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         function instantiateVertex( vertexId ) {
            var vertex = model.vertices[ vertexId ];
            var wIn = vertex.ports.inbound.filter( isConnected ).filter( isWire ).map( connectionAt );
            var wOut = vertex.ports.outbound.filter( isConnected ).filter( isWire ).map( connectionAt );
            var cIn = vertex.ports.inbound.filter( isConnected ).filter( isChannel ).map( connectionAt );
            var cOut = vertex.ports.outbound.filter( isConnected ).filter( isChannel ).map( connectionAt );

            if( vertex.label.indexOf( 'PROBE ' ) === 0 ) {
               gateBuilders.PROBE.apply( null, [ vertex.label ].concat( wIn ).concat( cOut ) );
            }
            else if( vertex.label === 'BRIDGE' ) {
               vertex.ports.inbound.forEach( function ( inPort, i ) {
                  var outPort = vertex.ports.outbound[ i ];
                  if( isConnected( inPort ) && isConnected( outPort ) ) {
                     gateBuilders.BRIDGE( connectionAt( inPort ), connectionAt( outPort ) );
                  }
               } );
            }
            else if( vertex.label in gateBuilders ) {
               gateBuilders[ vertex.label ].apply( null, wIn.concat( wOut ).concat( cIn ).concat( cOut ) );
            }
            else {
               window.console.error( 'Unknown circuit vertex: %s (id=%s)', vertex.label, vertexId );
            }
         }

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

   };

} );
