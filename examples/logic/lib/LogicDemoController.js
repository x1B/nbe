define( [
   'jquery',
   'angular',
   './logic_circuit_editor',
   'json!./data/primitives.json',
   'json!./data/dummy_model.json',
   'json!./data/dummy_layout.json'
], function( $, ng, logicCircuitEditorDirective, primitives, dummyModel, dummyLayout ) {
   'use strict';

   var keys = Object.keys;

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

      $scope.$watch( 'view.currentComponentId', function( newId ) {
         if( !newId ) {
            $scope.view.editorOpen = false;
         }
      } );

      $scope.view = {
         currentComponentId: null,
         newComponentId: null,
         flattened: {
            model: {},
            layout: {}
         }
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
                  classes: 'interface',
                  label: 'INPUT',
                  ports: {
                     inbound: [],
                     outbound: []
                  }
               },
               OUTPUT: {
                  classes: 'interface',
                  label: 'OUTPUT',
                  ports: {
                     inbound: [],
                     outbound: []
                  }
               }
            }
         };
      };


      function log( msg ) {
         $scope.messages.push( msg );
      }

      $scope.run = function() {
         var flatModel = $scope.view.flattened.model = { vertices: {}, edges: {} };
         flattenTo( flatModel, $scope.model.main, [] );
         console.log( 'flatModel: ', flatModel );

         $scope.messages.splice( 0, $scope.messages.length );
         var sim = circuitSimulator( instantTimeSimulator(), settings, log, $scope.model.components );
         $scope.$evalAsync( function() {
            sim.run( flatModel );
         } );
      };


      function flattenTo( result, circuit, ancestors ) {

         keys( circuit.edges ).forEach( function( edgeId ) {
            result.edges[ qualify( edgeId ) ] = ng.copy( circuit.edges[ edgeId ] );
         } );

         // connect internal interface edges to their external edges:
         if( ancestors.length ) {
            var placeholder = ancestors[ ancestors.length - 1 ].vertex;
            [ 'INPUT', 'OUTPUT' ].forEach( function( iface ) {
               var bridge = ng.copy( circuit.vertices[ iface ] );
               bridge.label = 'BRIDGE';
               bridge.classes = 'interface';
               var internal = iface === 'INPUT' ? 'inbound' : 'outbound';
               var external = iface === 'INPUT' ? 'outbound' : 'inbound';
               bridge.ports[ internal ] = ng.copy( placeholder.ports[ external ] );
               qualifyPorts( bridge.ports[ internal ] );
               result.vertices[ qualify( iface ) ] = bridge;
            } );
         }

         keys( circuit.vertices ).forEach( function( vertexId ) {
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

   function circuitSimulator( sim, settings, log, components ) {

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

         BRIDGE: function bridge( inputWire, outputWire ) {
            if( inputWire && outputWire ) {
               inputWire.onChange( function() {
                  sim.schedule( settings.bridgeDelay )( function() {
                     outputWire.set( inputWire.get() );
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
         keys( model.edges ).forEach( instantiateEdge );
         keys( model.vertices ).forEach( instantiateVertex );
         sim.run();

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
               vertex.ports.inbound.forEach( function( inPort, i ) {
                  var outPort = vertex.ports.outbound[ i ];
                  if( isConnected( inPort ) && isConnected( outPort )  ) {
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
   }


} );
