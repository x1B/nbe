/**
 * Conflict free generation of human readable object-local IDs.
 */
define( [], function() {
   'use strict';

   function IdGenerator() {

      this.create = create;

      function create( prefixes, currentMap ) {
         var generators = {};
         prefixes.forEach( function( prefix ) {
            generators[ prefix ] = generator( prefix, currentMap );
         } );

         return function next( optionalPrefix ) {
            var prefix = optionalPrefix || prefixes[ 0 ];
            return generators[ prefix ]();
         };
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function generator( prefix, currentMap ) {
         prefix = prefix || '';
         var maxIndex = Object.keys( currentMap )
            .filter( function( k ) {
               return k.indexOf( prefix ) === 0;
            } )
            .map( function( k ) {
               return parseInt( k.substring( prefix.length ), 10 );
            } )
            .reduce( function max( a, b ) {
               return a > b ? a : b;
            }, -1 );

         return function nextId() {
            ++maxIndex;
            return prefix + maxIndex;
         };
      }

   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   return {
      define: function( module ) {
         module.service( 'nbeIdGenerator', [IdGenerator] );
      }
   };

} );