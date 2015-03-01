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
   '../utilities/visual',
   '../utilities/pathing',
   'jquery_ui/draggable',
   'jquery_ui/droppable'
], function( $, ng, layoutModule, svgLinkPath ) {
   'use strict';

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   var DIRECTIVE_NAME = 'nbeLink';

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function createLinkDirective( nbeLayoutSettings, nbeAsync ) {

      return {
         restrict: 'A',
         controller: [ '$scope', '$element', function LinkController( $scope, $element ) {

            var self = this;

            $scope.controller.links.registerController( $scope.link.id, self );
            var jqGraph = $scope.controller.jqGraph;

            // Cache information that frequently accessed when repainting (during drag/drop):
            var jqSourceNode, jqSourceHandle;
            var jqDestNode, jqDestHandle;

            // API to be called when attached edges or vertices have been moved:
            self.repaint = function() {};
            self.toggleSelect = function toggleSelect( state ) {
               $element.toggleClass( 'nbe-selected', state );
            };

            //////////////////////////////////////////////////////////////////////////////////////////////////

            // Draw links after nodes, so that bounding boxes are available:
            nbeAsync.runEventually( init, $scope );

            //////////////////////////////////////////////////////////////////////////////////////////////////

            function pathUpdater() {
               var from = [ 0, 0 ];
               var fromBox = { top: 0, bottom: 0, left: 0, right: 0 };
               var to = [ 0, 0 ];
               var toBox = { top: 0, bottom: 0, left: 0, right: 0 };

               var boundingBox = layoutModule.boundingBox;
               var round = Math.round;

               function calculateLinkEnd( jqNode, jqHandle, coords, zoomFactor ) {
                  var portOffset = round( nbeLayoutSettings.portOffset * zoomFactor ),
                      edgeOffset = round( nbeLayoutSettings.edgeOffset * zoomFactor );

                  var graphOffset = jqGraph.offset();
                  if( jqHandle ) {
                     var portPos = jqHandle.offset();
                     coords[ 0 ] = portPos.left - graphOffset.left + portOffset;
                     coords[ 1 ] = portPos.top - graphOffset.top + portOffset;
                  }
                  else {
                     var edgePos = jqNode.offset();
                     coords[ 0 ] = edgePos.left - graphOffset.left + edgeOffset;
                     coords[ 1 ] = edgePos.top - graphOffset.top + edgeOffset;
                  }
               }

               function repaint() {

                  var zoomFactor = $scope.view.zoom.factor;
                  calculateLinkEnd( jqSourceNode, jqSourceHandle, from, zoomFactor );
                  calculateLinkEnd( jqDestNode, jqDestHandle, to, zoomFactor );
                  boundingBox( jqSourceNode, jqGraph, fromBox );
                  boundingBox( jqDestNode, jqGraph, toBox );
                  var path = svgLinkPath.cubic( from, to, null, zoomFactor, [fromBox, toBox], true );
                  $element.attr( 'd', path );
               }

               return repaint;
            }

            //////////////////////////////////////////////////////////////////////////////////////////////////

            function init() {
               var source = $scope.link.source;
               if( source.port ) {
                  var jqSourceInfo = jqVertexPlusHandle( source );
                  jqSourceNode = jqSourceInfo[ 0 ];
                  jqSourceHandle = jqSourceInfo[ 1 ];
                  if( !jqSourceHandle.length ) {
                     return false;
                  }
               }
               else {
                  jqSourceNode = jqEdge( $scope.link.source );
                  jqSourceHandle = null;
                  if( !jqSourceNode.length ) {
                     return false;
                  }
               }

               var dest = $scope.link.dest;
               if( dest.port ) {
                  var jqDestInfo = jqVertexPlusHandle( dest );
                  jqDestNode = jqDestInfo[ 0 ];
                  jqDestHandle = jqDestInfo[ 1 ];
                  if( !jqDestHandle.length ) {
                     return false;
                  }
               }
               else {
                  jqDestNode = jqEdge( dest );
                  jqDestHandle = null;
                  if( !jqDestNode.length ) {
                     return false;
                  }
               }

               // During development, CSS might not be ready yet, preventing layout calculations:
               if( $element.css( 'stroke' ) === 'none' ) {
                  // Delay display until CSS available
                  return false;
               }

               self.repaint = pathUpdater();
               self.repaint();
               return true;

               ///////////////////////////////////////////////////////////////////////////////////////////////

               function jqVertexPlusHandle( ref ) {
                  var jqNode = $( '[data-nbe-vertex="' + ref.nodeId + '"]', jqGraph );
                  var jqHandle = $( '[data-nbe-port="' + ref.port.id + '"] i', jqNode );
                  return [ jqNode, jqHandle ];
               }

               ///////////////////////////////////////////////////////////////////////////////////////////////

               function jqEdge( ref ) {
                  return $( '[data-nbe-edge="' + ref.nodeId + '"]', jqGraph );
               }
            }

            //////////////////////////////////////////////////////////////////////////////////////////////////

         } ]
      };
   }


   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   return {
      define: function( module ) {
         module.directive( DIRECTIVE_NAME, [ 'nbeLayoutSettings', 'nbeAsync', createLinkDirective ] );
      }
   };

} );