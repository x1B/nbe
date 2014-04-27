/**
 * A link represents a directed connection from a vertex to an edge or from an edge to a vertex.
 *
 * representation: {
 *    id: String,
 *    type: String,
 *    source: { nodeId: String, portId: String },
 *    dest: { nodeId: String, portId: String }
 * }
 *
 */
define( [
   'jquery',
   'angular',
   '../utilities/layout',
   '../utilities/pathing',
   'jquery_ui/draggable',
   'jquery_ui/droppable'
],
function ( $, ng, layout, svgLinkPath ) {
   'use strict';

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   var DIRECTIVE_NAME = 'nbeLink';

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function createLinkDirective( $window ) {

      return {
         restrict: 'A',
         controller: function LinkController( $scope, $element ) {

            $scope.nbeGraph.linkControllers[ $scope.link.id ] = this;

            // Cache information that frequently accessed when repainting (during drag/drop):
            var jqSourceNode, jqSourceHandle;
            var jqDestNode, jqDestHandle;

            // API to be called when attached edges or vertices have been moved:
            var repaint = this.repaint = pathUpdater();

            //////////////////////////////////////////////////////////////////////////////////////////////////

            // Draw links after nodes, so that bounding boxes are available:
            var initTimeout;
            function tryInit() {
               if( !init() ) {
                  // $timeout is not needed (no $scope manipulation)
                  initTimeout = $window.setTimeout( tryInit, 5 );
               }
            }
            tryInit();

            $scope.$on( '$destroy', function() {
               if ( initTimeout ) {
                  $window.clearTimeout( initTimeout );
               }
            } );

            //////////////////////////////////////////////////////////////////////////////////////////////////

            function pathUpdater() {
               var jqGraph = $scope.nbeGraph.jqGraph;

               var from = [ 0, 0 ];
               var fromBox = { top: 0, bottom: 0, left: 0, right: 0 };
               var to = [ 0, 0 ];
               var toBox = { top: 0, bottom: 0, left: 0, right: 0 };

               var portOffset = layout.PORT_DRAG_OFFSET,
                   edgeOffset = layout.EDGE_DRAG_OFFSET,
                   boundingBox = layout.boundingBox;

               function calculateLinkEnd( jqNode, jqHandle, coords ) {
                  var graphOffset = jqGraph.offset();
                  if( jqHandle ) {
                     var portPos = jqHandle.offset();
                     coords[ 0 ] = portPos.left - graphOffset.left + portOffset;
                     coords[ 1 ] = portPos.top - graphOffset.top + portOffset;
                  }
                  else {
                     var edgePos = jqNode.offset();
                     coords[ 0 ] = edgePos.left - graphOffset.left + edgeOffset;
                     coords[ 1 ] = edgePos.top - graphOffset.left + edgeOffset;
                  }
               }

               function update() {
                  calculateLinkEnd( jqSourceNode, jqSourceHandle, from );
                  calculateLinkEnd( jqDestNode, jqDestHandle, to );
                  boundingBox( jqSourceNode, jqGraph, fromBox );
                  boundingBox( jqDestNode, jqGraph, toBox );
                  var path = svgLinkPath.cubic( from[ 0 ], from[ 1 ], to[ 0 ], to[ 1 ], 1, -1, fromBox, toBox, false );
                  $element.attr( 'd', path );
               }

               return update;
            }

            //////////////////////////////////////////////////////////////////////////////////////////////////

            function init() {
               var source = $scope.link.source;
               if ( source.port ) {
                  var jqSourceInfo = jqVertexPlusHandle( source );
                  jqSourceNode = jqSourceInfo[ 0 ];
                  jqSourceHandle = jqSourceInfo[ 1 ];
                  if ( !jqSourceHandle.length ) {
                     return false;
                  }
               }
               else {
                  jqSourceNode = jqEdge( $scope.link.source );
                  jqSourceHandle = null;
                  if ( !jqSourceNode.length ) {
                     return false;
                  }
               }


               var dest = $scope.link.dest;
               if ( dest.port ) {
                  var jqDestInfo = jqVertexPlusHandle( dest );
                  jqDestNode = jqDestInfo[ 0 ];
                  jqDestHandle = jqDestInfo[ 1 ];
                  if ( !jqDestHandle.length ) {
                     return false;
                  }
               }
               else {
                  jqDestNode = jqEdge( dest );
                  jqDestHandle = null;
                  if ( !jqDestNode.length ) {
                     return false;
                  }
               }

               repaint();
               return true;

               ///////////////////////////////////////////////////////////////////////////////////////////////

               function jqVertexPlusHandle( ref ) {
                  var jqNode = $( '[data-nbe-vertex="' + ref.nodeId + '"]', $scope.nbeGraph.jqGraph );
                  var jqHandle = $( '[data-nbe-port="' + ref.port.id + '"] i', jqNode );
                  return [ jqNode, jqHandle ];
               }

               ///////////////////////////////////////////////////////////////////////////////////////////////

               function jqEdge( ref ) {
                  return $( '[data-nbe-edge="' + ref.nodeId + '"]', $scope.nbeGraph.jqGraph );
               }
            }

            //////////////////////////////////////////////////////////////////////////////////////////////////

         }
      }
   }


   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   return {
      define: function( module ) {
         module.directive( DIRECTIVE_NAME, [ '$window', createLinkDirective ] );
      }
   }

} );