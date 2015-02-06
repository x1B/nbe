/**
 * Dagre-based graph layout service.
 * Edges and vertices are fed to dagre layouter as nodes, and links are fed as edges.
 */
define( [
   'dagre',
   'jquery'
], function( dagre, $ ) {
   'use strict';

   var IN = 'inbound', OUT = 'outbound';
   var DIRECTIONS = [ IN, OUT ];

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function AutoLayout( nbeLayoutSettings ) {
      var round = Math.round,
          min = Math.min;
      var graphPadding = nbeLayoutSettings.graphPadding;

      function calculate( model, types, jqGraph, zoomFactor ) {
         var jqVertices = $( '.vertex', jqGraph[ 0 ] );
         var jqEdges = $( '.nbe-edge', jqGraph[ 0 ] );
         if( !jqVertices.length ) {
            return false;
         }
         var offset = { left: Infinity, top: Infinity };
         var dagreGraph = createDagreGraph( jqVertices, jqEdges, zoomFactor, model, types, offset );
         if( offset.left === Infinity || offset.top === Infinity ) {
            return { vertices: {}, edges: {} };
         }

         var dagreResult =
                dagre.layout().nodeSep( 60 ).rankSep( 90 ).edgeSep( 0 ).rankDir( 'LR' ).run( dagreGraph );
         return layoutFromDagreResult( dagreResult, offset, model.edgesToLayout );
      }

      this.calculate = calculate;

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function layoutFromDagreResult( dagreResult, offset, edgesToLayout ) {
         var left = offset.left;
         var top = offset.top;
         var layout = { vertices: {}, edges: {} };
         dagreResult.eachNode( function( dagreNodeId, properties ) {
            var nodeId = dagreNodeId.substring( 2 );
            if( dagreNodeId.charAt( 0 ) === 'V' ) {
               var vertexLayout = layout.vertices[ nodeId ] = {};
               vertexLayout.left = round( properties.x - properties.width / 2 + graphPadding + left );
               vertexLayout.top = round( properties.y - properties.height / 2 + graphPadding + top );
            }
            else if( !edgesToLayout || edgesToLayout[ nodeId ] ) {
               var edgeLayout = layout.edges[ nodeId ] = {};
               edgeLayout.left = round( properties.x - properties.width / 2 + graphPadding + left );
               edgeLayout.top = round( properties.y - properties.height / 2 + graphPadding + top );
            }
         } );
         return layout;
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function createDagreGraph( jqVertices, jqEdges, zoomFactor, model, types, offset ) {
         var dagreGraph = new dagre.Digraph();

         var inputRefsByEdge = {};
         jqVertices.each( function( i, domVertex ) {
            var id = domVertex.dataset.nbeVertex;
            var vertex = model.vertices[ id ];
            if( vertex ) {
               var dagreNodeId = 'V:' + id;
               var jqVertex = $( domVertex );
               var dagreNode = {
                  width: jqVertex.width() / zoomFactor,
                  height: jqVertex.height() / zoomFactor
               };
               var pos = jqVertex.position();
               offset.left = min( parseInt( pos.left ), offset.left );
               offset.top = min( parseInt( pos.top ), offset.top );
               dagreGraph.addNode( dagreNodeId, dagreNode );

               vertex.ports.outbound.filter( isConnected ).forEach( function( port ) {
                  inputRefsByEdge[ port.edgeId ] = inputRefsByEdge[ port.edgeId ] || [];
                  inputRefsByEdge[ port.edgeId ].push( { nodeId: id, port: port } );
               } );
            }
         } );

         jqEdges.each( function( i, domEdge ) {
            var id = domEdge.dataset.nbeEdge;
            if( model.edges[ id ] ) {
               var dagreNodeId = 'E:' + id;
               var jqEdge = $( domEdge );
               var dagreNode = { width: jqEdge.width() / zoomFactor, height: jqEdge.height() / zoomFactor };
               var pos = jqEdge.position();
               offset.left = min( parseInt( pos.left ), offset.left );
               offset.top = min( parseInt( pos.top ), offset.top );
               dagreGraph.addNode( dagreNodeId, dagreNode );
            }
         } );

         // Create links in the dagre graph:
         var vertices = model.vertices;
         Object.keys( vertices ).forEach( function( vertexId ) {
            var dagreVertexId = 'V:' + vertexId;
            var vertex = vertices[ vertexId ];
            DIRECTIONS.forEach( function( direction ) {
               vertex.ports[ direction ].filter( isConnected ).forEach( function( port ) {
                  var edgeId = port.edgeId;
                  if ( !model.edges[ edgeId ] ) {
                     return;
                  }

                  var typeDef = types[ port.type ];
                  if( typeDef.simple ) {
                     if( !typeDef.hidden && direction === IN ) {
                        ( inputRefsByEdge[ edgeId ] || [] ).forEach( function ( ref ) {
                           dagreGraph.addEdge( null, 'V:' + ref.nodeId, dagreVertexId );
                        } );
                     }
                  }
                  else {
                     var dagreEdgeId = 'E:' + port.edgeId;
                     if( direction === IN ) {
                        // ignore incoming edges of hidden type.
                        if( !typeDef.hidden ) {
                           dagreGraph.addEdge( null, dagreEdgeId, dagreVertexId );
                        }
                     }
                     else {
                        dagreGraph.addEdge( null, dagreVertexId, dagreEdgeId );
                     }
                  }
               } );
            } );
         } );

         return dagreGraph;
      }
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function isConnected( port ) { return !!port.edgeId; }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   return {
      define: function( module ) {
         module.service( 'nbeAutoLayout', ['nbeLayoutSettings', AutoLayout] );
      }
   };

} );
