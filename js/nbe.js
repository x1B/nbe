define( [
   'angular',
   './directives/edge',
   './directives/graph',
   './directives/link',
   './directives/port',
   './directives/vertex',
   './services/auto-layout',
   './services/async'
],
function ( ng, edge, graph, link, port, vertex, async, autoLayout ) {
   'use strict';

   var nbe = ng.module( 'nbe', [] );

   // Services
   async.define( nbe );
   autoLayout.define( nbe );

   // Directives
   graph.define( nbe );
   edge.define( nbe );
   link.define( nbe );
   port.define( nbe );
   vertex.define( nbe );

   return nbe;

} );