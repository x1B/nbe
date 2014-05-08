define( [
   'angular',
   './constants/settings',
   './services/async',
   './services/auto-layout',
   './directives/edge',
   './directives/graph',
   './directives/link',
   './directives/port',
   './directives/vertex'
],
function ( ng, settings, async, autoLayout, edge, graph, link, port, vertex ) {
   'use strict';

   var nbe = ng.module( 'nbe', [] );

   // Constants
   nbe.constant( 'nbeAsyncSettings', settings.async );
   nbe.constant( 'nbeLayoutSettings', settings.layout );
   nbe.constant( 'nbePathingSettings', settings.pathing );

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