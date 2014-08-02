/** Handles external updates to the graph model such as addition of vertices by an application controller. */
define( [ 'angular', 'jquery', 'visual' ], function( ng, $ ) {
   'use strict';

   return function graphUpdatesController( jqGraph, layoutController, nextTick ) {

      function updateTypes( newTypes ) {
         Object.keys( newTypes ).forEach( function ( type ) {
            var hideType = !!( newTypes[ type ] && newTypes[ type ].hidden );
            jqGraph.toggleClass( 'hide-' + type, hideType );
         } );
         repaint();
         adjustCanvasSize();
      }

      function updateVertices( newVertices, previousVertices ) {
         if ( newVertices == null ) {
            return;
         }

         var outputRefsByEdge = { };
         var inputRefsByEdge = { };
         ng.forEach( newVertices, function ( vertex, vId ) {
            vertex.ports.filter( connected ).forEach( function ( port ) {
               var table = port.direction === 'in' ? inputRefsByEdge : outputRefsByEdge;
               table[ port.edgeId ] = table[ port.edgeId ] || [];
               table[ port.edgeId ].push( { nodeId: vId, port: port } );
            } );
         } );

         ng.forEach( newVertices, function ( vertex, vId ) {
            if ( !previousVertices[ vId ] ) {
               nextTick( function () {
                  var jqNew = $( '[data-nbe-vertex="' + vId + '"]' );
                  visual.pingAnimation( jqNew );
               } );
            }
            vertex.ports.filter( connected ).forEach( function ( port ) {
               var contextRef = { nodeId: vId, port: port };
               if ( !self.links.byPort( vId, port ).length ) {
                  if ( $scope.types[ port.type ].simple ) {
                     var isInput = port.direction === 'in';
                     var table = isInput ? outputRefsByEdge : inputRefsByEdge;
                     ( table[ port.edgeId ] || [] ).forEach( function ( ref ) {
                        self.links.create( isInput ? ref : contextRef, isInput ? contextRef : ref );
                     } );
                  }
                  else {
                     var edgeRef = { nodeId: port.edgeId, port: null };
                     self.links.create( contextRef, edgeRef );
                  }
               }
            } );
         } );
      }

      function updateEdges( newEdges, previousEdges ) {
         if ( newEdges == null ) {
            return;
         }
         ng.forEach( newEdges, function ( vertex, vId ) {
            if ( !previousEdges[ vId ] ) {
               nextTick( function () {
                  var jqNew = $( '[data-nbe-edge="' + vId + '"]' );
                  visual.pingAnimation( jqNew );
               } );
            }
         } );
      }

   };

} );