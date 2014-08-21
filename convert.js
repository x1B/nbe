
function transform( model ) {

   var newVertices = {};

   Object.keys( m.vertices ).forEach( function( k ) {

      var v = m.vertices[ k ];

      var newV = {
         label: v.label,
         ports: {
            inbound: v.ports.filter( function( p ) { return p.direction === 'in'; } ),
            outbound: v.ports.filter( function( p ) { return p.direction !== 'in'; } )
         }
      };

      newVertices[ k ] = newV;

   } );

   return {
      vertices: newVertices,
      edges: model.edges
   };

}
