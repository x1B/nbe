/**
 * An edge is a node which has no named ports, but can have 0..n input links and 0..n output links itself.
 *
 * It represents a multi-edge in a directed graph model, and may connect an arbitrary number of vertices.
 */
define( [
   'jquery',
   'angular',
   'text!./logic_circuit_editor.html',
   'json!./data/templates.json'
], function( $, ng, htmlTemplate, templates ) {
   'use strict';

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   var DIRECTIVE_NAME = 'logicCircuitEditor';

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function createCircuitEditorDirective() {

      return {
         template: htmlTemplate,
         replace: true,
         restrict: 'A',
         scope: {
            model: '=' + DIRECTIVE_NAME,
            layout: '=' + DIRECTIVE_NAME + 'Layout'
         },
         transclude: true,
         controller: [ '$scope', 'nbeIdGenerator', LogicCircuitEditorController ]
      };

      function LogicCircuitEditorController( $scope, nbeIdGenerator ) {
         var gateIdGenerator = nbeIdGenerator.create( [ 'v' ], $scope.model.vertices );
         $scope.addGate = function( gateType ) {
            var id = gateIdGenerator();
            $scope.model.vertices[ id ] = ng.copy( templates.model[ gateType  ] );
            $scope.layout.vertices[ id ] = ng.copy( templates.layout );
         };

         var probeIdGenerator = nbeIdGenerator.create( [ 'PROBE ' ], $scope.model.vertices );
         $scope.addProbe = function() {
            var id = probeIdGenerator();
            var probeVertex = ng.copy( templates.model.PROBE );
            probeVertex.label = id;
            $scope.model.vertices[ id ] = probeVertex;
            $scope.layout.vertices[ id ] = ng.copy( templates.layout );
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