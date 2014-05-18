define( [], function() {
   'use strict';

   function noOp() {
   }

   noOp.undo = noOp;

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function makeCompositionOp( args ) {
      var n = args.length;

      function compositionOp() {
         for( var i = 0; i < n; ++i ) {
            args[ i ]();
         }
      }

      compositionOp.undo = function() {
         for( var i = n; i-- > 0; ) {
            args[ i ].undo();
         }
      };
      return compositionOp;
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   return {

      create: function( $scope ) {
         var past = [];
         var future = [];
         return {
            perform: function( op ) {
               if( op !== noOp ) {
                  $scope.$apply( op );
                  past.push( op );
                  future.splice( 0, future.length );
               }
            },
            startTransaction: function() {
               var tx = [];
               return {
                  perform: function( op ) {
                     if( op !== noOp ) {
                        $scope.$apply( op );
                        future.splice( 0, future.length );
                        tx.push( op );
                     }
                  },
                  commit: function() {
                     past.push( makeCompositionOp( tx ) );
                  },
                  rollBack: function() {
                     $scope.$apply( makeCompositionOp( tx ).undo );
                  }
               };
            },
            undo: function() {
               var op = past.pop();
               if( op ) {
                  $scope.$apply( op.undo );
                  future.push( op );
               }
            },
            redo: function() {
               var op = future.pop();
               if( op ) {
                  $scope.$apply( op );
                  past.push( op );
               }
            }
         };
      },

      noOp: noOp,

      compose: makeCompositionOp

   };

} );