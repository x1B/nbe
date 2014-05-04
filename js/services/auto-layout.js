/**
 * Dagre-based graph layout service.
 * Edges and vertices are fed to dagre layouter as nodes, and links are fed as edges.
 */
define( [
   'dagre',
   'jquery',
   '../utilities/layout'
],
function ( dagre, $, layout ) {
   'use strict';

   var PADDING = layout.GRAPH_PADDING;

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function AutoLayout() {
      function calculate( scope, jqGraph ) {
         var jqVertices = $( '.vertex', jqGraph[ 0 ] );
         var jqEdges = $( '.edge', jqGraph[ 0 ] );
         if ( !jqVertices.length || !jqEdges.length ) {
            return false;
         }

         var dagreGraph = createDagreGraph( jqVertices, jqEdges, scope.model );
         var dagreResult = dagre.layout().nodeSep( 40 ).rankSep( 75 ).edgeSep( 0 ).rankDir( 'LR' ).run( dagreGraph );
         return layoutFromDagreResult( dagreResult );
      }

      this.calculate = calculate;
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function layoutFromDagreResult( dagreResult ) {
      var layout = { vertices: {}, edges: {} };
      dagreResult.eachNode( function( dagreNodeId, properties ) {
         if ( dagreNodeId.charAt( 0 ) === 'V' ) {
            var vertexLayout = layout.vertices[ dagreNodeId.substring( 2 ) ] = {};
            vertexLayout.left = Math.round( properties.x - properties.width/2 + PADDING );
            vertexLayout.top = Math.round( properties.y - properties.height/2 + PADDING );
         }
         else {
            var edgeLayout = layout.edges[ dagreNodeId.substring( 2 ) ] = {};
            edgeLayout.left = Math.round( properties.x - properties.width/2 + PADDING );
            edgeLayout.top = Math.round( properties.y - properties.height/2 + PADDING );
         }
      } );
      return layout;
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function createDagreGraph( jqVertices, jqEdges, model ) {
      var dagreGraph = new dagre.Digraph();

      jqVertices.each( function( i, domVertex ) {
         var dagreNodeId = 'V:' + domVertex.dataset.nbeVertex;
         var jqVertex = $( domVertex );
         var dagreNode = { width: jqVertex.width(), height: jqVertex.height() };
         dagreGraph.addNode( dagreNodeId, dagreNode );
      } );

      jqEdges.each( function( i, domEdge ) {
         var dagreNodeId = 'E:' + domEdge.dataset.nbeEdge;
         var jqEdge = $( domEdge );
         var dagreNode = { width: jqEdge.width(), height: jqEdge.height() };
         dagreGraph.addNode( dagreNodeId, dagreNode );
      } );

      // Create links in the dagre graph:
      var vertices = model.vertices;
      Object.keys( vertices ).forEach( function( vertexId ) {
         var dagreVertexId = 'V:' + vertexId;
         vertices[ vertexId ].ports.forEach( function( port ) {
            if( !port.edgeId ) {
               return;
            }
            var dagreEdgeId = 'E:' + port.edgeId;
            if( port.direction === 'in' ) {
               dagreGraph.addEdge( null, dagreEdgeId, dagreVertexId );
            }
            else {
               dagreGraph.addEdge( null, dagreVertexId, dagreEdgeId );
            }
         } );
      } );

      return dagreGraph;
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   return {
      define: function( module ) {
         module.service( 'nbeAutoLayout', [ AutoLayout ] );
      }
   };

} );
