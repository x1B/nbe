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
               types: '=' + DIRECTIVE_NAME + 'Types',
               readonly: '=' + DIRECTIVE_NAME + 'Readonly',
               updateOn: '=' + DIRECTIVE_NAME + 'UpdateOn'
            },
            transclude: true,
            controller: [ '$scope', '$element', GraphController ]
         };

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         function GraphController( $scope, $element ) {

            var self = $scope.controller = this;

            /** Provide access to the jQuery handle to the graph canvas element */
            self.jqGraph = $( $element[ 0 ] );

            self.calculateLayout = calculateLayout;

            setupModel( $scope, self );

            setupControllers( $scope, self );

            if( $scope.layout.needsLayout ) {
               self.calculateLayout();
               $scope.layout.needsLayout = false;
            }

            //////////////////////////////////////////////////////////////////////////////////////////////////

            function calculateLayout() {
               async.runEventually( function() {
                  var input;
                  if( self.selection.isEmpty() ) {
                     input = $scope.model;
                  }
                  else {
                     input = { edges: $scope.model.edges, vertices: {}, edgesToLayout: {} };
                     Object.keys( self.selection.edges() ).forEach( function( edgeId ) {
                        input.edgesToLayout[ edgeId ] = true;
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
                     self.canvas.repaint();
                  }

                  return !!result;
               }, $scope, 500 );
            }

         }

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         function setupModel( $scope, self ) {
            $scope.types = $scope.types || {};
            if( !$scope.layout ) {
               $scope.layout = { needsLayout: true, edges: {}, vertices: {} };
            }
            $scope.view = {
               hasFocus: false,
               selection: {
                  vertices: {},
                  edges: {},
                  links: {}
               },
               links: {},
               zoom: {
                  factor: 1,
                  percent: 100,
                  levels: [ 25, 50, 75, 100 ],
                  level: 3
               }
            };
         }

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         function setupControllers( $scope, self ) {
            var ops = operationsModule.create( $scope );

            var jqGraph = self.jqGraph;

            var canvas = createCanvasController(
               $scope.layout, $scope.view, layoutSettings, jqGraph, $timeout );

            var links = createLinksController( $scope.view, $scope.types, canvas, idGenerator );

            var updates = createUpdatesController( $scope.types, canvas, links, jqGraph, $timeout );

            var dragDrop = createDragDropController( ops, jqGraph );

            var selection = createSelectionController(
               $scope.model, $scope.view, $scope.layout, $scope.types, links, jqGraph, async, $document, $scope );

            var operations = createGraphOperationsController(
               $scope.readonly, $scope.model, $scope.layout, $scope.types, ops, canvas, links, selection, idGenerator );

            createKeysController( $scope.view, jqGraph, $document, ops, operations, dragDrop, selection );

            // controller API:
            self.dragDrop = dragDrop;
            self.links = links;
            self.operations = ops;
            self.selection = selection;
            self.canvas = canvas;
            self.operations = operations;
            self.zoom = canvas.zoom;

            watchUpdates();

            //////////////////////////////////////////////////////////////////////////////////////////////////

            function watchUpdates() {

               var updateOn = $scope.updateOn;
               if( !updateOn ) {
                  // fallback to watchers:
                  $scope.$watch( 'types', updates.updateTypes, true );
                  $scope.$watch( 'layout', canvas.repaint, true );
                  $scope.$watch( 'model.edges', updates.updateEdges, true );
                  $scope.$watch( 'model.vertices', function( newVertices, previousVertices ) {
                     selection.clear();
                     updates.updateVertices( newVertices, previousVertices );
                  }, true );
                  return;
               }

               // enable reactive updates:
               var updateBuffer = {
                  edges: $scope.model.edges,
                  vertices: $scope.model.vertices,
                  layout: $scope.layout,
                  types: $scope.types
               };

               if( ng.isString( updateOn ) ) {
                  $scope.$on( updateOn, updateAll );
               }
               else {
                  if( updateOn.model ) {
                     $scope.$on( updateOn.model, updateModel );
                  }
                  if( updateOn.layout ) {
                     $scope.$on( updateOn.layout, updateLayout );
                  }
                  if( updateOn.types ) {
                     $scope.$on( updateOn.types, updateTypes );
                  }
               }

               $scope.$evalAsync( updateAll );

               function updateLayout() {
                  canvas.repaint();
               }

               function updateTypes() {
                  updates.updateTypes( $scope.types, updateBuffer.types );
                  updateBuffer.types = ng.copy( $scope.types );
               }

               function updateModel() {
                  selection.clear();
                  updates.updateEdges( $scope.model.edges, updateBuffer.edges );
                  updateBuffer.edges = ng.copy( $scope.model.edges );
                  updates.updateVertices( $scope.model.vertices, updateBuffer.vertices );
                  updateBuffer.vertices = ng.copy( $scope.model.vertices );
               }

               function updateAll() {
                  updateTypes();
                  updateModel();
                  updateLayout();
               }
            }

            //////////////////////////////////////////////////////////////////////////////////////////////////

         }
      }
   ];

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   return {
      define: function( module ) {
         module.directive( DIRECTIVE_NAME, createGraphDirective );
      }
   };

} );