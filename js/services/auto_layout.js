/**
 * Dagre-based graph layout service.
 * Edges and vertices are fed to dagre layouter as nodes, and links are fed as edges.
 */
define( [
   'dagre',
   'jquery'
],
function ( dagre, $ ) {
   'use strict';

   function AutoLayout( nbeLayoutSettings ) {
      var graphPadding = nbeLayoutSettings.graphPadding;

      function calculate( model, types, jqGraph ) {
         var jqVertices = $( '.vertex', jqGraph[ 0 ] );
         var jqEdges = $( '.edge', jqGraph[ 0 ] );
         if ( !jqVertices.length || !jqEdges.length ) {
            return false;
         }
         var offset = { left: Infinity, top: Infinity };
         var dagreGraph = createDagreGraph( jqVertices, jqEdges, model, types, offset );
         if( offset.left === Infinity || offset.top === Infinity ) {
            return { vertices: {}, edges: {} };
         }

         var dagreResult = dagre.layout().nodeSep( 60 ).rankSep( 90 ).edgeSep( 0 ).rankDir( 'LR' ).run( dagreGraph );
         return layoutFromDagreResult( dagreResult, offset );
      }

      this.calculate = calculate;

      ///////////////////////////////////////////////////////////////////////////////////////////////////////////

      function layoutFromDagreResult( dagreResult, offset ) {
         var left = offset.left;
         var top = offset.top;
         var layout = { vertices: {}, edges: {} };
         dagreResult.eachNode( function( dagreNodeId, properties ) {
            if ( dagreNodeId.charAt( 0 ) === 'V' ) {
               var vertexLayout = layout.vertices[ dagreNodeId.substring( 2 ) ] = {};
               vertexLayout.left = Math.round( properties.x - properties.width/2 + graphPadding + left );
               vertexLayout.top = Math.round( properties.y - properties.height/2 + graphPadding + top );
            }
            else {
               var edgeLayout = layout.edges[ dagreNodeId.substring( 2 ) ] = {};
               edgeLayout.left = Math.round( properties.x - properties.width/2 + graphPadding + left );
               edgeLayout.top = Math.round( properties.y - properties.height/2 + graphPadding + top );
            }
         } );
         return layout;
      }

      ///////////////////////////////////////////////////////////////////////////////////////////////////////////

      function createDagreGraph( jqVertices, jqEdges, model, types, offset ) {
         var dagreGraph = new dagre.Digraph();

         jqVertices.each( function( i, domVertex ) {
            var id = domVertex.dataset.nbeVertex;
            if ( model.vertices[ id ] ) {
               var dagreNodeId = 'V:' + id;
               var jqVertex = $( domVertex );
               var dagreNode = { width: jqVertex.width(), height: jqVertex.height() };
               var pos = jqVertex.position();
               offset.left = Math.min( parseInt( pos.left ), offset.left );
               offset.top = Math.min( parseInt( pos.top ), offset.top );
               dagreGraph.addNode( dagreNodeId, dagreNode );
            }
         } );

         jqEdges.each( function( i, domEdge ) {
            var id = domEdge.dataset.nbeEdge;
            if ( model.edges[ id ] ) {
               var dagreNodeId = 'E:' + id;
               var jqEdge = $( domEdge );
               var dagreNode = { width: jqEdge.width(), height: jqEdge.height() };
               var pos = jqEdge.position();
               offset.left = Math.min( parseInt( pos.left ), offset.left );
               offset.top = Math.min( parseInt( pos.top ), offset.top );
               dagreGraph.addNode( dagreNodeId, dagreNode );
            }
         } );

         // Create links in the dagre graph:
         var vertices = model.vertices;
         Object.keys( vertices ).forEach( function( vertexId ) {
            var dagreVertexId = 'V:' + vertexId;
            vertices[ vertexId ].ports.forEach( function( port ) {
               if( !port.edgeId || !model.edges[ port.edgeId ] ) {
                  return;
               }
               var dagreEdgeId = 'E:' + port.edgeId;
               if( port.direction === 'in' ) {
                  // ignore incoming edges of hidden type.
                  if ( !types[ port.type ].hidden ) {
                     dagreGraph.addEdge( null, dagreEdgeId, dagreVertexId );
                  }
               }
               else {
                  dagreGraph.addEdge( null, dagreVertexId, dagreEdgeId );
               }
            } );
         } );

         return dagreGraph;
      }
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   return {
      define: function( module ) {
         module.service( 'nbeAutoLayout', [ 'nbeLayoutSettings', AutoLayout ] );
      }
   };

} );
