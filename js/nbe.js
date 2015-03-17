define( [
   'angular',
   './constants/settings',
   './services/async',
   './services/auto_layout',
   './services/id_generator',
   './directives/edge',
   './directives/graph',
   './directives/link',
   './directives/port',
   './directives/vertex',
   './directives/minimap'
], function( ng, settings, async, autoLayout, idGenerator, edge, graph, link, port, vertex, minimap ) {
   'use strict';

   var nbe = ng.module( 'nbe', [] );

   // Constants
   nbe.constant( 'nbeAsyncSettings', settings.async );
   nbe.constant( 'nbeLayoutSettings', settings.layout );
   nbe.constant( 'nbePathingSettings', settings.pathing );

   // Services
   async.define( nbe );
   autoLayout.define( nbe );
   idGenerator.define( nbe );

   // Directives
   graph.define( nbe );
   edge.define( nbe );
   link.define( nbe );
   port.define( nbe );
   vertex.define( nbe );
   minimap.define( nbe );

   return nbe;

} );