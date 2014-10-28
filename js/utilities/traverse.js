define( [], function() {
   'use strict';

   var IN = 'inbound';
   var OUT = 'outbound';

   return {
      eachPort: function forEachPort( vertex, f ) {
         vertex.ports[ IN ].forEach( function( port ) { f( port, IN ); } );
         vertex.ports[ OUT ].forEach( function( port ) { f( port, OUT ); } );
      },
      eachConnectedPort: function forEachConnectedPort( vertex, f ) {
         vertex.ports[ IN ].forEach( function( port ) { f( port, IN ); } );
         vertex.ports[ OUT ].forEach( function( port ) { f( port, OUT ); } );
      }
   };

} );
