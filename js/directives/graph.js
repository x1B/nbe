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
   createOperationsController,
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

            setupApi( self );
         }

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         function setupModel( $scope, self ) {
            $scope.types = $scope.types || {};
            if( !$scope.layout ) {
               $scope.layout = {};
               calculateLayout( $scope, self );
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

            var layoutModel = $scope.layout;
            var viewModel = $scope.view;
            var typesModel = $scope.types;

            var canvas = self.canvas =
               createCanvasController( layoutModel, viewModel, layoutSettings, jqGraph, $timeout );

            var links = self.links =
               createLinksController( viewModel, typesModel, idGenerator );

            var updates = self.updates =
               createUpdatesController( typesModel, canvas, links, jqGraph, $timeout );

            var dragdrop = self.dragDrop =
               createDragDropController( jqGraph, ops );

            var selection = self.selection =
               createSelectionController();

            var keys = self.keys = createKeysController();
            self.zoom = self.layout.zoom;

            canvas.repaint();
            $scope.$watch( 'layout', async.ensure( canvas.repaint, 50 ), true );
            $scope.$watch( 'types', updates.updateTypes, true );
            $scope.$watch( 'model.vertices', updates.updateVertices, true );
            $scope.$watch( 'model.edges', updates.updateEdges, true );
         }

         //////////////////////////////////////////////////////////////////////////////////////////////////

         function setupApi() {
            /*
             self.makeConnectOp = makeConnectOp;
             self.makeDisconnectOp = makeDisconnectOp;
             self.calculateLayout = calculateLayout;
             self.adjustCanvasSize = adjustCanvasSize;
             */
         }

         //////////////////////////////////////////////////////////////////////////////////////////////////

         function calculateLayout( $scope, self ) {
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
                  $timeout( self.layout.repaint );
               }
               return !!result;
            }, $scope, 1500 );
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