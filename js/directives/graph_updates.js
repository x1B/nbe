/**
 * Handles external updates to the graph model such as addition of vertices by an application controller.
 */
define( [ 'angular', 'jquery', '../utilities/visual' ], function( ng, $, visual ) {
   'use strict';

   var IN = 'inbound', OUT = 'outbound';
   var DIRECTIONS = [ IN, OUT ];

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

      /** Update the view model when nodes have been added/removed */
      function updateVertices( newVertices, previousVertices ) {
         if( newVertices == null ) {
            return;
         }

         var outputRefsByEdge = { };
         var inputRefsByEdge = { };
         ng.forEach( newVertices, function( vertex, vId ) {
            DIRECTIONS.forEach( function( direction ) {
               vertex.ports[ direction ].filter( connected ).forEach( function ( port ) {
                  var table = direction === IN ? inputRefsByEdge : outputRefsByEdge;
                  table[ port.edgeId ] = table[ port.edgeId ] || [];
                  table[ port.edgeId ].push( { nodeId: vId, port: port, direction: direction } );
               } );
            } );
         } );

         ng.forEach( newVertices, function( vertex, vId ) {
            if( !previousVertices[ vId ] ) {
               nextTick( function() {
                  var jqNew = $( '[data-nbe-vertex="' + vId + '"]' );
                  visual.pingAnimation( jqNew );
               } );
            }
            DIRECTIONS.forEach( function( direction ) {
               vertex.ports[ direction ].filter( connected ).forEach( function( port ) {
                  var contextRef = { nodeId: vId, port: port, direction: direction };
                  if( !linksController.byPort( vId, port ).length ) {
                     if( typesModel[ port.type ].simple ) {
                        var isInput = direction === 'in';
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
         } );
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      /** Update the view model when edges have been added/removed */
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