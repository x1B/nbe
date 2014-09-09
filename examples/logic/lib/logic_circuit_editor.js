/**
 * An edge is a node which has no named ports, but can have 0..n input links and 0..n output links itself.
 *
 * It represents a multi-edge in a directed graph model, and may connect an arbitrary number of vertices.
 */
define( [
   'jquery',
   'angular',
   'text!./logic_circuit_editor.html',
   'json!./data/primitives.json'
], function( $, ng, htmlTemplate, primitives ) {
   'use strict';

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   var DIRECTIVE_NAME = 'logicCircuitEditor';

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function createCircuitEditorDirective() {

      var counter = 0;

      return {
         template: htmlTemplate,
         replace: true,
         restrict: 'A',
         scope: {
            model: '=' + DIRECTIVE_NAME,
            components: '=' + DIRECTIVE_NAME + 'Components',
            layout: '=' + DIRECTIVE_NAME + 'Layout'
         },
         transclude: true,
         controller: [ '$scope', 'nbeIdGenerator', LogicCircuitEditorController ]
      };

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function nextLayout() {
         ++counter;
         var place = 50 + (counter%10)*10;
         return { left: place, top: place };
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function LogicCircuitEditorController( $scope, nbeIdGenerator ) {
         $scope.view = { componentToAdd: null };

         var nextGateId = nbeIdGenerator.create( [ 'GATE' ], $scope.model.vertices );
         $scope.addGate = function( gateType ) {
            var id = nextGateId();
            $scope.model.vertices[ id ] = ng.copy( primitives[ gateType  ] );
            $scope.layout.vertices[ id ] = nextLayout();
         };

         var nextProbeId = nbeIdGenerator.create( [ 'PROBE ' ], $scope.model.vertices );
         $scope.addProbe = function() {
            var id = nextProbeId();
            var probeVertex = ng.copy( primitives.PROBE );
            probeVertex.label = id;
            $scope.model.vertices[ id ] = probeVertex;
            $scope.layout.vertices[ id ] = nextLayout();
         };

         var nextInstanceId = nbeIdGenerator.create( [ 'COMPONENT' ], $scope.model.vertices );
         $scope.addComponent = function() {
            var id = nextInstanceId();
            var component = $scope.components[ $scope.view.componentToAdd ];

            $scope.model.vertices[ id ] = {
               label: $scope.view.componentToAdd,
               ports: {
                  inbound: component.vertices.INPUT.ports.outbound.map( function( port ) {
                     return { id: port.id, type: port.type };
                  } ),
                  outbound: component.vertices.OUTPUT.ports.inbound.map( function( port ) {
                     return { id: port.id, type: port.type };
                  } )
               }
            };
            $scope.layout.vertices[ id ] = nextLayout();
         };

         // For editing components:
         $scope.addIo = function( adapter ) {
            var direction = adapter === 'INPUT' ? 'outbound' : 'inbound';
            var portGroup = $scope.model.vertices[ adapter ].ports[ direction ];
            var idPrefix = adapter === 'INPUT' ? 'x' : 'y';
            var id = idPrefix + portGroup.length;
            console.log( 'id', id );
         };

         $scope.removeIo = function( adapter ) {
            var direction = adapter === 'INPUT' ? 'outbound' : 'inbound';
            var portGroup = $scope.model.vertices[ adapter ].ports[ direction ];
            portGroup.pop();
         };
      }

   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   return {
      define: function( module ) {
         module.directive( DIRECTIVE_NAME, [ createCircuitEditorDirective ] );
      }
   };

} );