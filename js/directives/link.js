define( [
   'underscore',
   'jquery',
   'jquery.ui',
   'angular',
   '../utilities/layout',
   '../utilities/pathing'
],
function ( _, $, jqueryUi, ng, layout, svgLinkPath, undefined ) {
   'use strict';

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   var DIRECTIVE_NAME = 'nbeLink';

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function createLinkDirective( $timeout ) {

      return {
         restrict: 'A',
         controller: function LinkController( $scope, $element ) {

            // ngClass does not work with SVG
            var basicLinkClass = $element.attr( 'class' );
            $element.attr( 'class', basicLinkClass + " " + $scope.link.type );

            var graph = $scope.nbeGraph;
            graph.linkControllers[ $scope.link.id ] = this;
            var jqGraph = graph.jqGraph;
            var graphOffset = jqGraph.offset();

            var source = $scope.link.source;
            var dest = $scope.link.dest;

            var jqSourceNode, jqSourceHandle;
            var jqDestNode, jqDestHandle;

            var updatePath = pathUpdater();

            $timeout( init, 1 );

            //////////////////////////////////////////////////////////////////////////////////////////////////

            this.updatePath = updatePath;

            //////////////////////////////////////////////////////////////////////////////////////////////////

            function jqVertexPlusHandle( portInfo ) {
               // console.log( 'Looking for node', portInfo.node );
               var jqNode = $( '[data-nbe-vertex="' + portInfo.node + '"]', jqGraph );
               var jqHandle = $( '[data-nbe-port="' + portInfo.port + '"] i', jqNode );
               // console.log( 'Node: ', jqSourceNode.get(0) );
               // console.log( 'Port: ', jqSourcePort.get(0) );
               return [ jqNode, jqHandle ];
            }

            //////////////////////////////////////////////////////////////////////////////////////////////////

            function jqEdge( portInfo ) {
               return $( '[data-nbe-edge="' + portInfo.node + '"]', jqGraph );
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
                  var path = svgLinkPath( from[ 0 ], from[ 1 ], to[ 0 ], to[ 1 ], 1, -1, fromBox, toBox );
                  $element.attr( 'd', path );
               }

               return update;
            }

            //////////////////////////////////////////////////////////////////////////////////////////////////

            function init() {
               // console.log( 'link controller: ', $scope.link );
               // console.log( 'init SP: ', source.port, ' DP: ', dest.port );

               if ( source.port ) {
                  var jqSourceInfo = jqVertexPlusHandle( source );
                  jqSourceNode = jqSourceInfo[0];
                  jqSourceHandle = jqSourceInfo[1];
               }
               else {
                  jqSourceNode = jqEdge( source );
                  jqSourceHandle = null;
               }

               if ( dest.port ) {
                  var jqDestInfo = jqVertexPlusHandle( dest );
                  jqDestNode = jqDestInfo[0];
                  jqDestHandle = jqDestInfo[1];
               }
               else {
                  jqDestNode = jqEdge( dest );
                  jqDestHandle = null;
               }

               // console.log( "SN: ", jqSourceNode.get(0).tagName, jqSourceHandle && jqSourceHandle.get(0) );
               // console.log( "DN: ", jqDestNode.get(0).tagName, jqDestHandle && jqDestHandle.get(0) );
               updatePath();
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