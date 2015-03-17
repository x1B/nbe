define( [
   'jquery',
   'angular',
   'text!./minimap.html',
   'jquery_ui/draggable'
], function( $, ng, minimapHtml ) {
   'use strict';

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   var DIRECTIVE_NAME = 'nbeMinimap';

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function createMinimapDirective( nbeLayoutSettings ) {

      return {
         restrict: 'A',
         replace: true,
         template: minimapHtml,
         controller: [ '$scope', '$element', function MinimapController( $scope, $element ) {

            console.log( 'Minimap controller here' );

            $scope.controller.canvas.addRepaintHandler( repaint );

            function repaint() {

               console.log( 'repaint!' );

            }
         } ]
      };

   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   return {
      define: function( module ) {
         module.directive( DIRECTIVE_NAME, [ 'nbeLayoutSettings', createMinimapDirective ] );
      }
   };

} );