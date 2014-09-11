define( [ 'angular' ], function( ng ) {
   'use strict';

   return flatten;

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   /**
    * From a circuit which may reference components, create a self-contained circuit.
    * Call it like this:
    * ```js
    * var flatCircuit = flatten( circuit ).using( components );
    * ```
    */
   function flatten( circuit ) {
      return {
         using: function( components ) {
            var result = { edges: {}, vertices: {} };
            flattenUsing( circuit, components, [], result );
            return result;
         }
      };
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function flattenUsing( circuit, components, ancestors, result ) {

      Object.keys( circuit.edges ).forEach( function ( edgeId ) {
         result.edges[ qualify( edgeId ) ] = ng.copy( circuit.edges[ edgeId ] );
      } );

      // connect internal interface edges to their external edges:
      if ( ancestors.length ) {
         var placeholder = ancestors[ ancestors.length - 1 ].vertex;
         [ 'INPUT', 'OUTPUT' ].forEach( function ( iface ) {
            var bridge = ng.copy( circuit.vertices[ iface ] );
            bridge.label = 'BRIDGE';
            bridge.classes = 'interface';
            var internal = iface === 'INPUT' ? 'outbound' : 'inbound';
            var external = iface === 'INPUT' ? 'inbound' : 'outbound';
            bridge.ports[ external ] = ng.copy( placeholder.ports[ external ] );
            qualifyPorts( bridge.ports[ internal ] );
            result.vertices[ qualify( iface ) ] = bridge;
         } );
      }

      Object.keys( circuit.vertices ).forEach( function ( vertexId ) {
         var sourceVertex = circuit.vertices[ vertexId ];
         var stackEntry = { vertex: sourceVertex, id: vertexId };
         var component = componentOf( sourceVertex );
         if( component && !ancestors.some( sameComponent( sourceVertex ) ) ) {
            flattenUsing( component, components, ancestors.concat( [ stackEntry ] ), result );
         }
         else if( sourceVertex.label !== 'INPUT' && sourceVertex.label !== 'OUTPUT' ) {
            // vertex represents a primitive (gate or signal):
            var copy = ng.copy( sourceVertex );
            qualifyPorts( copy.ports.inbound );
            qualifyPorts( copy.ports.outbound );
            result.vertices[ qualify( vertexId ) ] = copy;
         }
      } );

      /////////////////////////////////////////////////////////////////////////////////////////////////////

      function qualify( id ) {
         return ancestors.map( function ( _ ) { return _.id; } ).concat( [ id ] ).join( '/' );
      }

      /////////////////////////////////////////////////////////////////////////////////////////////////////

      function qualifyPorts( portGroup ) {
         portGroup.forEach( function ( port ) {
            port.edgeId = qualify( port.edgeId );
            port.id = qualify( port.id );
         } );
      }

      /////////////////////////////////////////////////////////////////////////////////////////////////////

      function sameComponent( vertex ) {
         return function ( stackEntry ) {
            return stackEntry.vertex.label === vertex.label;
         };
      }

      /////////////////////////////////////////////////////////////////////////////////////////////////////

      function componentOf( vertex ) {
         return components[ vertex.label ];
      }

   }


} );