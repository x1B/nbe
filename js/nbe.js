define( [
   'angular',
   './directives/edge',
   './directives/graph',
   './directives/link',
   './directives/port',
   './directives/vertex',
   './services/auto-layout',
],
function ( ng, edge, graph, link, port, vertex, autoLayout ) {
   'use strict';

   var nbe = ng.module( 'nbe', [] );

   graph.define( nbe );
   edge.define( nbe );
   link.define( nbe );
   port.define( nbe );
   vertex.define( nbe );
   autoLayout.define( nbe );

   return nbe;

} );