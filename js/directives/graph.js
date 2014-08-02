define( [
   'jquery',
   'underscore',
   'angular',
   '../utilities/operations',
   'text!./graph.html'
], function( $, _, ng, operationsModule, graphHtml ) {
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
   function createGraphDirective( $timeout, $document, layoutSettings, async, autoLayout, idGenerator ) {

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

         /** Transient members, re-initialized when the model is replaced. */
         var generateLinkId;
         var generateEdgeId;

         var self = $scope.nbeController = this;
         self.dragDrop = dragDropController();
         self.selection = selectionController();
         self.links = linksController();
         self.zoom = zoomController();


         /** Provide access to the jQuery handle to the graph canvas element */
         var jqGraph = this.jqGraph = $( $element[ 0 ] );

         // Controller API:
         self.makeConnectOp = makeConnectOp;
         self.makeDisconnectOp = makeDisconnectOp;

         // Manage layout and rendering:
         self.calculateLayout = calculateLayout;
         self.adjustCanvasSize = adjustCanvasSize;


         var ops = this.operations = operationsModule.create( $scope );

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         $scope.$watch( 'types', updateTypes, true );
         $scope.$watch( 'model.vertices', updateVertices, true );
         $scope.$watch( 'model.edges', updateEdges, true );

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         initGraph( $scope );

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         function initGraph( $scope ) {
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
            generateLinkId = idGenerator.create( [ 'lnk' ], {} );

            jqGraph[ 0 ].addEventListener( 'mousedown', self.selection.start );
            $document.on( 'keydown', handleKeys );
            repaint();
            $scope.$watch( 'layout', async.ensure( adjustCanvasSize, 50 ), true );
         }

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         function isInput( port ) {
            return port && port.direction === 'in';
         }

         function isOutput( port ) {
            return port && port.direction !== 'in';
         }

         function isSimple( typed ) {
            return !!$scope.types[ typed.type ].simple;
         }

         function connected( port ) {
            return !!port.edgeId;
         }

         /////////////////////////////////////////////////////////////////////////////////////////////////////

      }

   }

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
         module.directive( DIRECTIVE_NAME, [
            '$timeout', '$document', 'nbeLayoutSettings', 'nbeAsync', 'nbeAutoLayout', 'nbeIdGenerator',
            createGraphDirective
         ] );
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