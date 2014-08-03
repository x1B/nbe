define( [
   'jquery',
   'angular',
   '../utilities/operations',
   './graph_canvas',
   './graph_links',
   './graph_updates',
   './graph_operations',
   './graph_dragdrop',
   './graph_selection',
   './graph_keys',
   'text!./graph.html'
], function(
   $,
   ng,
   operationsModule,
   createCanvasController,
   createLinksController,
   createUpdatesController,
   createGraphOperationsController,
   createDragDropController,
   createSelectionController,
   createKeysController,
   graphHtml ) {
   'use strict';

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   var DIRECTIVE_NAME = 'nbeGraph';

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   /**
    * The Graph directive controller manages the view-model for the underlying graph.
    * It is mainly concerned with creating and maintaining links and their controllers.
    * Links are visible connections that represent multi-edge membership.
    * Each link has one end at a vertex node's port (input or output) and one end at an edge node.
    */
   var createGraphDirective = [
      '$timeout', '$document', 'nbeLayoutSettings', 'nbeAsync', 'nbeAutoLayout', 'nbeIdGenerator',
      function( $timeout, $document, layoutSettings, async, autoLayout, idGenerator ) {

         return {
            template: graphHtml,
            replace: true,
            restrict: 'A',
            scope: {
               model: '=' + DIRECTIVE_NAME,
               controller: '=' + DIRECTIVE_NAME + 'Controller',
               layout: '=' + DIRECTIVE_NAME + 'Layout',
               types: '=' + DIRECTIVE_NAME + 'Types'
            },
            transclude: true,
            controller: [ '$scope', '$element', GraphController ]
         };

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         function GraphController( $scope, $element ) {

            var self = $scope.controller = this;

            /** Provide access to the jQuery handle to the graph canvas element */
            self.jqGraph = $( $element[ 0 ] );

            setupModel( $scope, self );

            setupControllers( $scope, self );

            self.calculateLayout = calculateLayout;

            //////////////////////////////////////////////////////////////////////////////////////////////////

            function calculateLayout() {
               async.runEventually( function() {
                  var input;
                  if( self.selection.isEmpty() ) {
                     input = $scope.model;
                  }
                  else {
                     input = { edges: {}, vertices: {} };
                     Object.keys( self.selection.edges() ).forEach( function( edgeId ) {
                        input.edges[ edgeId ] = $scope.model.edges[ edgeId ];
                     } );
                     Object.keys( self.selection.vertices() ).forEach( function( vertexId ) {
                        input.vertices[ vertexId ] = $scope.model.vertices[ vertexId ];
                     } );
                  }

                  var result = autoLayout.calculate( input, $scope.types, self.jqGraph, $scope.view.zoom.factor );
                  if( result ) {
                     var layoutEdges = $scope.layout.edges;
                     Object.keys( result.edges ).forEach( function( edgeId ) {
                        layoutEdges[ edgeId ] = result.edges[ edgeId ];
                     } );
                     var layoutVertices = $scope.layout.vertices;
                     Object.keys( result.vertices ).forEach( function( vertexId ) {
                        layoutVertices[ vertexId ] = result.vertices[ vertexId ];
                     } );
                     $timeout( self.canvas.repaint );
                  }
                  return !!result;
               }, $scope, 1500 );
            }

         }

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         function setupModel( $scope, self ) {
            $scope.types = $scope.types || {};
            if( !$scope.layout ) {
               // :TODO: needed?
               $scope.layout = { edges: {}, vertices: {} };
               self.calculateLayout();
            }
            $scope.view = {
               selection: {
                  vertices: {},
                  edges: {},
                  links: {}
               },
               links: {},
               zoom: {
                  factor: 1,
                  percent: 100,
                  levels: [ 10, 25, 50, 75, 100 ],
                  level: 3
               }
            };
         }

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         function setupControllers( $scope, self ) {
            var ops = self.operations = operationsModule.create( $scope );

            var jqGraph = self.jqGraph;


            var canvas = self.canvas =
                   createCanvasController( $scope.layout, $scope.view, layoutSettings, jqGraph, $timeout );

            var links = self.links =
                   createLinksController( $scope.view, $scope.types, canvas, idGenerator );

            var updates =
                   createUpdatesController( $scope.types, canvas, links, jqGraph, $timeout );

            var dragDrop = self.dragDrop =
                   createDragDropController( jqGraph, ops );

            var selection = self.selection =
               createSelectionController( $scope.model, $scope.view, $scope.layout, links, jqGraph, $document, $scope );

            var operations = self.operations =
                   createGraphOperationsController( $scope.model, $scope.types, ops, canvas, links, selection, idGenerator );

            createKeysController( $document, ops, operations, dragDrop );

            self.zoom = canvas.zoom;

            canvas.repaint();
            $scope.$watch( 'layout', async.ensure( canvas.repaint, 50 ), true );
            $scope.$watch( 'types', updates.updateTypes, true );
            $scope.$watch( 'model.vertices', updates.updateVertices, true );
            $scope.$watch( 'model.edges', updates.updateEdges, true );
         }

      }
   ];

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   return {
      define: function( module ) {
         module.directive( DIRECTIVE_NAME, createGraphDirective );
         module.filter( 'nbeInputPorts', function() {
            return function( ports ) {
               return ports.filter( function( _ ) {
                  return _.direction === 'in';
               } );
            };
         } );
         module.filter( 'nbeOutputPorts', function() {
            return function( ports ) {
               return ports.filter( function( _ ) {
                  return _.direction !== 'in';
               } );
            };
         } );
      }
   };

} );