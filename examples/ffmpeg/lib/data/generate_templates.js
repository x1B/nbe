define( [
   'text!./filters.txt'
], function( filters ) {
   'use strict';

   var fieldSep = /[ ]+/;
   var lineSep = '\n';

   var TYPES = { V: 'VIDEO', A: 'AUDIO' };
   var lines = filters.split( lineSep );

   function isVideo( template ) {
      return template.ports.some( function( port ) {
         return port.type === 'VIDEO';
      } );
   }

   var videoTemplates = {};
   var audioTemplates = {};
   lines.map( templateFromLine ).forEach( function( template ) {
      ( isVideo( template ) ? videoTemplates : audioTemplates )[ template.label ] = template;
   } );

   function templateFromLine( line ) {
      var fields = line.split( fieldSep );
      var label = fields[ 2 ];

      var ports = [];
      var portGroupsDef = fields[ 3 ].split( '->' );
      [ 'in', 'out' ].forEach( function( direction, i ) {
         portGroupsDef[ i ].split( '' ).forEach( function ( t ) {
            if( t === 'A' || t === 'V' ) {
               ports.push( {
                  id: '' + ports.length,
                  label: 'XYZ'.charAt( i ),
                  direction: direction,
                  description: fields[ 4 ],
                  type: TYPES[ t ]
               } );
            }
         } );
      } );

      return {
         label: label,
         ports: ports
      };
   }

   console.log( JSON.stringify( videoTemplates.boxblur ) );

   return {
      video: videoTemplates,
      audio: audioTemplates,
      layout: {
         left: 100,
         top: 100
      }
   };

} );
