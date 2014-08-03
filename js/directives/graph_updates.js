/**
 * Handles external updates to the graph model such as addition of vertices by an application controller.
 */
define( [ 'angular', 'jquery', '../utilities/visual' ], function( ng, $, visual ) {
   'use strict';

   return function( typesModel, canvasController, linksController, jqGraph, nextTick ) {

      return {
         updateTypes: updateTypes,
         updateVertices: updateVertices,
         updateEdges: updateEdges
      };

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function updateTypes( newTypes ) {
         Object.keys( newTypes ).forEach( function( type ) {
            var hideType = !!( newTypes[ type ] && newTypes[ type ].hidden );
            jqGraph.toggleClass( 'hide-' + type, hideType );
         } );
         canvasController.repaint();
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function updateVertices( newVertices, previousVertices ) {
         if( newVertices == null ) {
            return;
         }

         var outputRefsByEdge = { };
         var inputRefsByEdge = { };
         ng.forEach( newVertices, function( vertex, vId ) {
            vertex.ports.filter( connected ).forEach( function( port ) {
               var table = port.direction === 'in' ? inputRefsByEdge : outputRefsByEdge;
               table[ port.edgeId ] = table[ port.edgeId ] || [];
               table[ port.edgeId ].push( { nodeId: vId, port: port } );
            } );
         } );

         ng.forEach( newVertices, function( vertex, vId ) {
            if( !previousVertices[ vId ] ) {
               nextTick( function() {
                  var jqNew = $( '[data-nbe-vertex="' + vId + '"]' );
                  visual.pingAnimation( jqNew );
               } );
            }
            vertex.ports.filter( connected ).forEach( function( port ) {
               var contextRef = { nodeId: vId, port: port };
               if( !linksController.byPort( vId, port ).length ) {
                  if( typesModel[ port.type ].simple ) {
                     var isInput = port.direction === 'in';
                     var table = isInput ? outputRefsByEdge : inputRefsByEdge;
                     ( table[ port.edgeId ] || [] ).forEach( function( ref ) {
                        linksController.create( isInput ? ref : contextRef, isInput ? contextRef : ref );
                     } );
                  }
                  else {
                     var edgeRef = { nodeId: port.edgeId, port: null };
                     linksController.create( contextRef, edgeRef );
                  }
               }
            } );
         } );
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function updateEdges( newEdges, previousEdges ) {
         if( newEdges == null ) {
            return;
         }
         Object.keys( newEdges ).forEach( function( edgeId ) {
            if( !previousEdges[ edgeId ] ) {
               canvasController.pingEdge( edgeId );
            }
         } );
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function connected( port ) {
         return !!port.edgeId;
      }

   };

} );