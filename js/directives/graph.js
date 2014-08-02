define( [
   'jquery',
   'angular',
   '../utilities/operations',
   './graph_layout',
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
   createLayoutController,
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
               nbeController: '=nbeGraphController',
               model: '=nbeGraph',
               layout: '=nbeGraphLayout',
               types: '=nbeGraphTypes'
            },
            transclude: true,
            controller: [ '$scope', '$element', GraphController ]
         };

         ////////////////////////////////////////////////////////////////////////////////////////////////////////

         function GraphController( $scope, $element ) {

            /** Shorthands to $scope.* */

            /** @type {{ edges: {}, vertices: {}<String, {ports: []}> }} */
            var model;
            var layout;
            var types;
            var view;

            var ops = this.operations = operationsModule.create( $scope );

            /** Transient members, re-initialized when the model is replaced. */
            var self = $scope.nbeController = this;
            self.layout = createLayoutController();
            self.links = createLinksController();
            self.updates = createUpdatesController();
            self.dragDrop = createDragDropController();
            self.selection = createSelectionController();
            self.keys = createKeysController();
            self.zoom = self.layout.zoom;


            /** Provide access to the jQuery handle to the graph canvas element */
            var jqGraph = this.jqGraph = $( $element[ 0 ] );

            // External controller API for application controllers:
            self.makeConnectOp = makeConnectOp;
            self.makeDisconnectOp = makeDisconnectOp;

            // Internal controller API for nbe-directives:
            self.calculateLayout = calculateLayout;
            self.adjustCanvasSize = adjustCanvasSize;



            /////////////////////////////////////////////////////////////////////////////////////////////////////

            $scope.$watch( 'types', updateTypes, true );
            $scope.$watch( 'model.vertices', updateVertices, true );
            $scope.$watch( 'model.edges', updateEdges, true );

            /////////////////////////////////////////////////////////////////////////////////////////////////////

            initialize( $scope );

            /////////////////////////////////////////////////////////////////////////////////////////////////////

            function initialize( $scope ) {
               model = $scope.model;
               types = $scope.types || {};
               layout = $scope.layout;
               if( !layout ) {
                  self.calculateLayout();
               }
               view = $scope.view = {
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

               generateEdgeId = idGenerator.create(
                  Object.keys( types ).map( function( _ ) {
                     return _.toLocaleLowerCase() + ' ';
                  } ),
                  model.edges
               );

               self.layout.repaint();
               $scope.$watch( 'layout', async.ensure( adjustCanvasSize, 50 ), true );
            }

            //////////////////////////////////////////////////////////////////////////////////////////////////

            function calculateLayout() {
               async.runEventually( function () {
                  var input = $scope.model;
                  if ( !self.selection.isEmpty() ) {
                     var sel = $scope.view.selection;
                     input = { edges: {}, vertices: {} };
                     Object.keys( sel.edges ).forEach( function ( edgeId ) {
                        input.edges[ edgeId ] = $scope.model.edges[ edgeId ];
                     } );
                     Object.keys( sel.vertices ).forEach( function ( vertexId ) {
                        input.vertices[ vertexId ] = $scope.model.vertices[ vertexId ];
                     } );
                  }

                  var result = autoLayout.calculate( input, $scope.types, jqGraph, $scope.view.zoom.factor );
                  if ( result ) {
                     Object.keys( result.edges ).forEach( function ( edgeId ) {
                        layout.edges[ edgeId ] = result.edges[ edgeId ];
                     } );
                     Object.keys( result.vertices ).forEach( function ( vertexId ) {
                        layout.vertices[ vertexId ] = result.vertices[ vertexId ];
                     } );
                     $timeout( self.layout.repaint );
                  }
                  return !!result;
               }, $scope, 1500 );
            }

         }
      }
   ];

   /*
   function fmtR( ref ) {
      return '[' + ref.nodeId + ':' + ( ref.port || {id:'*'} ).id + ']';
   }

   function fmtL( link ) {
      var edgeId = ( link.source.port || link.dest.port ).edgeId;
      return link.id + ':' + fmtR( link.source ) + '--(' + edgeId +')-->' + fmtR( link.dest );
   }
   */

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