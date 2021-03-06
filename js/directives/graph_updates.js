/**
 * Handles external updates to the graph model such as addition of vertices by an application controller.
 */
define( [
   'angular', 'jquery', '../utilities/visual', '../utilities/traverse'
], function( ng, $, visual, traverse ) {
   'use strict';

   var IN = 'inbound';

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
            jqGraph.toggleClass( 'nbe-hide-type-' + type, hideType );
         } );
         canvasController.repaint();
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      /** Update the view model after nodes have been added/removed */
      function updateVertices( newVertices, previousVertices ) {
         // rebuild link model (calculating a delta would be possible, but probably not worth it)
         ng.forEach( previousVertices, function( vertex, vId ) {
            traverse.eachConnectedPort( vertex, function( port ) {
               linksController.byPort( vId, port ).forEach( linksController.destroy );
            } );
         } );

         if( !newVertices ) {
            return;
         }

         // Track added vertices:
         var outputRefsByEdge = {};
         var inputRefsByEdge = {};
         ng.forEach( newVertices, function( vertex, vId ) {
            traverse.eachConnectedPort( vertex, function( port, direction ) {
               var table = direction === IN ? inputRefsByEdge : outputRefsByEdge;
               table[ port.edgeId ] = table[ port.edgeId ] || [];
               table[ port.edgeId ].push( { nodeId: vId, port: port, direction: direction } );
            } );
         } );

         ng.forEach( newVertices, function( vertex, vId ) {
            if( !previousVertices[ vId ] && previousVertices === newVertices ) {
               nextTick( function() {
                  var jqNew = $( '[data-nbe-vertex="' + vId + '"]' );
                  visual.pingAnimation( jqNew );
               } );
            }

            traverse.eachConnectedPort( vertex, function( port, direction ) {
               var contextRef = { nodeId: vId, port: port, direction: direction };
               if( !linksController.byPort( vId, port ).length ) {
                  if( typesModel[ port.type ].simple ) {
                     var isInput = direction === IN;
                     var table = isInput ? outputRefsByEdge : inputRefsByEdge;
                     ( table[ port.edgeId ] || [] ).forEach( function ( ref ) {
                        linksController.create( isInput ? ref : contextRef, isInput ? contextRef : ref );
                     } );
                  }
                  else {
                     var edgeRef = { nodeId: port.edgeId, direction: direction, port: null };
                     linksController.create( contextRef, edgeRef );
                  }
               }
            } );

         } );

      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      /** Update the view model after edges have been added/removed */
      function updateEdges( newEdges, previousEdges ) {
         if( newEdges == null ) {
            return;
         }
         if( newEdges === previousEdges ) {
            Object.keys( newEdges ).forEach( function ( edgeId ) {
               if ( !previousEdges[edgeId] ) {
                  canvasController.pingEdge( edgeId );
               }
            } );
         }
      }

   };

} );