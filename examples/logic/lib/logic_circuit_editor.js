define( [
   'angular',
   'text!logic/logic_circuit_editor.html',
   'json!logic/data/primitives.json'
], function( ng, htmlTemplate, primitives ) {
   'use strict';

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   var DIRECTIVE_NAME = 'lcEditor';

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
         controller: [ '$scope', 'nbeIdGenerator', LcEditorController ]
      };

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function nextLayout() {
         ++counter;
         var place = 50 + (counter%10)*10;
         return { left: place, top: place };
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function LcEditorController( $scope, nbeIdGenerator ) {
         $scope.view = {
            componentToAdd: Object.keys( $scope.components )[ 0 ],
            newByteValue: null
         };

         var nextGateId = nbeIdGenerator.create( [ 'GATE' ], $scope.model.vertices );
         var nextProbeId = nbeIdGenerator.create( [ 'PROBE ' ], $scope.model.vertices );
         var nextInstanceId = nbeIdGenerator.create( [ 'COMPONENT' ], $scope.model.vertices );

         $scope.addPrimitive = function( gateType ) {
            var id = nextGateId();
            $scope.model.vertices[ id ] = ng.copy( primitives[ gateType  ] );
            $scope.layout.vertices[ id ] = nextLayout();
         };

         $scope.add4Bit = function( integer ) {
            if( integer > 15 ) { return; }
            var id = nextGateId();
            var vertex = ng.copy( primitives[ '4BIT' ] );
            for( var b = 0; b < vertex.ports.outbound.length; ++b ) {
               vertex.ports.outbound[ b ].label = ( 1 << b & integer ) > 0 ? '1' : '0';
            }
            vertex.label += ': ' + integer;
            $scope.model.vertices[ id ] = vertex;
            $scope.layout.vertices[ id ] = nextLayout();
         };

         $scope.addProbe = function() {
            var id = nextProbeId();
            var probeVertex = ng.copy( primitives.PROBE );
            probeVertex.label = id;
            $scope.model.vertices[ id ] = probeVertex;
            $scope.layout.vertices[ id ] = nextLayout();
         };

         $scope.addComponent = function() {
            var id = nextInstanceId();
            var component = $scope.components[ $scope.view.componentToAdd ];

            $scope.model.vertices[ id ] = {
               label: $scope.view.componentToAdd,
               classes: 'component',
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

         $scope.addInterfacePort = function( iface ) {
            var isInput = iface === 'INPUT';
            var direction = isInput ? 'outbound' : 'inbound';
            var portGroup = $scope.model.vertices[ iface ].ports[ direction ];
            var id = ( isInput ? 'x' : 'y' ) + portGroup.length;
            var port = { id: id, label: id, type: 'WIRE' };
            portGroup.push( port );
            $scope.$emit( 'lc.interface.added', iface, port );
         };

         $scope.removeInterfacePort = function( iface ) {
            var direction = iface === 'INPUT' ? 'outbound' : 'inbound';
            var portGroup = $scope.model.vertices[ iface ].ports[ direction ];
            portGroup.pop();
            $scope.$emit( 'lc.interface.removed', iface );
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