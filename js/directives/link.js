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

   function createLinkDirective( $timeout ) {

      // :TODO: use isolate scope
      return {
         restrict: 'A',
         controller: function LinkController( $scope, $element ) {

            var graph = $scope.nbeGraph;
            graph.linkControllers[ $scope.link.id ] = this;
            var jqGraph = graph.jqGraph;
            var graphOffset = jqGraph.offset();

            var source = $scope.link.source;
            var dest = $scope.link.dest;

            var jqSourceNode, jqSourceHandle;
            var jqDestNode, jqDestHandle;

            var repaint = this.repaint = pathUpdater();

            $timeout( init, 0 );

            //////////////////////////////////////////////////////////////////////////////////////////////////

            function jqVertexPlusHandle( ref ) {
               var jqNode = $( '[data-nbe-vertex="' + ref.nodeId + '"]', jqGraph );
               var jqHandle = $( '[data-nbe-port="' + ref.port.id + '"] i', jqNode );
               return [ jqNode, jqHandle ];
            }

            //////////////////////////////////////////////////////////////////////////////////////////////////

            function jqEdge( ref ) {
               return $( '[data-nbe-edge="' + ref.nodeId + '"]', jqGraph );
            }

            //////////////////////////////////////////////////////////////////////////////////////////////////

            function pathUpdater() {
               var from = [ 0, 0 ];
               var fromBox = { top: 0, bottom: 0, left: 0, right: 0 };
               var to = [ 0, 0 ];
               var toBox = { top: 0, bottom: 0, left: 0, right: 0 };

               var portOffset = layout.PORT_DRAG_OFFSET,
                   edgeOffset = layout.EDGE_DRAG_OFFSET,
                   boundingBox = layout.boundingBox;

               function calculateLinkEnd( jqNode, jqHandle, coords ) {
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
                  var path = svgLinkPath( from[ 0 ], from[ 1 ], to[ 0 ], to[ 1 ], 1, -1, fromBox, toBox, false);
                  $element.attr( 'd', path );
               }

               return update;
            }

            //////////////////////////////////////////////////////////////////////////////////////////////////

            function init() {
               if ( source.port ) {
                  var jqSourceInfo = jqVertexPlusHandle( source );
                  jqSourceNode = jqSourceInfo[ 0 ];
                  jqSourceHandle = jqSourceInfo[ 1 ];
               }
               else {
                  jqSourceNode = jqEdge( source );
                  jqSourceHandle = null;
               }

               if ( dest.port ) {
                  var jqDestInfo = jqVertexPlusHandle( dest );
                  jqDestNode = jqDestInfo[ 0 ];
                  jqDestHandle = jqDestInfo[ 1 ];
               }
               else {
                  jqDestNode = jqEdge( dest );
                  jqDestHandle = null;
               }
               repaint();
            }

            //////////////////////////////////////////////////////////////////////////////////////////////////

         }
      }
   }


   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   return {
      define: function( module ) {
         module.directive( DIRECTIVE_NAME, [ '$timeout', createLinkDirective ] );
      }
   }

} );