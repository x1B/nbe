define( [
   'underscore',
   'jquery',
   'jquery.ui',
   'angular',
   'dummy_data'
],
function ( _, $, jqueryUi, ng, data ) {
   "use strict";

   // noinspection JSCheckFunctionSignatures
   var module = ng.module( 'GraphWidget', [ ] );

   //////////////////////////////////////////////////////////////////////////////////////////////////////////

   var round = Math.round;
   function svgLinePath( fromLeft, fromTop, toLeft, toTop ) {
      return [ 'M', round( fromLeft ), ' ', round( fromTop ),
               ' L', round( toLeft ), ' ', round( toTop ) ].join('');
   }

   //////////////////////////////////////////////////////////////////////////////////////////////////////////

   var nextLinkId = 0;
   function createLink( sourceNode, sourcePort, destNode, destPort ) {
      return {
         id: nextLinkId++,
         source: { node: sourceNode, port: sourcePort },
         dest: { node: destNode, port: destPort }
      };
   }

   //////////////////////////////////////////////////////////////////////////////////////////////////////////

   function GraphWidget( $scope ) {
      var model = $scope.model = data.get( 'dummyModel' );
      var layout = $scope.layout = data.get( 'dummyLayout' );
      var links = layout.links = { };

      var linksBySource = $scope.linksByDestination = { };
      var linksByDest = $scope.linksBySource = { };

      function insertLink( sourceNodeId, sourcePortId, destNodeId, destPortId ) {
         var link = createLink( sourceNodeId, sourcePortId, destNodeId, destPortId );
         links[ link.id ] = link;
         var sourceKey = sourceNodeId + (sourcePortId ? sourcePortId + '.' : '');
         linksBySource[ sourceKey ] = link;
         var destKey = destNodeId + (destPortId ? destPortId + '.' : '');
         linksByDest[ destKey ] = link;
      }

      ng.forEach( model.vertices, function( vertex, vertexId ) {
         ng.forEach( vertex.ports.in, function( port, portId ) {
            if ( port.edge )
               insertLink( port.edge, null, vertexId, portId );
         } );
         ng.forEach( vertex.ports.out, function( port, portId ) {
            if ( port.edge )
               insertLink( vertexId, portId, port.edge, null );
         } );
      } );

      console.log( 'links:', links );
      console.log( 'scope:', $scope );
   }

   GraphWidget.$inject = [ '$scope' ];

   // noinspection JSUnusedGlobalSymbols
   module.controller( 'GraphWidget', GraphWidget );

   //////////////////////////////////////////////////////////////////////////////////////////////////////////

   module.directive( 'nbeGraph', function createVertexDirective() {

      return {
         restrict: 'A',
         controller: function VertexController( $scope, $element ) {
            this.jqGraph = $( $element[ 0 ] );
            $scope.nbeGraph = this;
         }
      };

   } );

   //////////////////////////////////////////////////////////////////////////////////////////////////////////

   module.directive( 'nbeVertex', function createVertexDirective() {
      return {
         restrict: 'A',
         controller: function VertexController( $scope, $element ) {

            $( $element[ 0 ] ).draggable( {
               stack: '.graph *',
               containment: 'parent',
               start: handleVertexDragStart
            } );

            function handleVertexDragStart( event, ui ) {
               console.log( '[v->]' );
            }

            this.jqGraph = $( $element[ 0 ].parentNode );
            $scope.nbeVertex = this;

         }
      };
   } );

   //////////////////////////////////////////////////////////////////////////////////////////////////////////

   module.directive( 'nbePort', function createPortDirective() {


      var PORT_CLASS_IN = 'in', PORT_CLASS_OUT = 'out';

      var round = Math.round;

      return {
         restrict: 'A',
         controller: function PortController( $scope, $element ) {

            var portType = '' + $scope.port.type;
            // console.log( $scope.port.label, $( 'i', $element[0] )[0], $scope.port.type );

            var graphController = $scope.nbeGraph;
            var jqGraph = graphController.jqGraph;
            var jqPortGhost = $( '.port.GHOST', jqGraph );
            var jqLinkGhost= $( '.link.GHOST', jqGraph );

            // Drag starting position, relative to graph canvas.
            var sourcePortLeft, sourcePortTop;
            var lineOffset = 10; // how to calculate reliably?

            // console.log( jqGraph );

            $( 'i', $element[0] ).draggable( {
               opacity: 0.8,
               helper: function() {
                  return $( '.GHOST.port', jqGraph ).clone();
               },
               zIndex: 1000,
               start: handlePortDragStart,
               drag: handlePortDrag,
               stop: handleDrop,
               addClasses: false,
               appendTo: jqGraph
            } );

            var basicLinkClass = jqLinkGhost.attr( "class" ) + " ";
            /**
             * if this is an IN port:
             *    if there is no link here: stop.
             *    else: $source = $link.sourcePort
             * else:
             *    if there is a $link with
             * , draw line from current OUT port to mouse
             * if this is an OUT port:
             * ... draw line from port to mouse
             * @param event
             * @param ui
             */
            function handlePortDragStart( event, ui ) {
               var $portHandle = $( event.target );
               var $portGroup = $portHandle.parent().parent();
               if ( $portGroup.hasClass( PORT_CLASS_IN ) ) {
                  // find source node
               }
               else {
                  // set self as source port
                  var portPos = ui.position;
                  sourcePortLeft = portPos.left + lineOffset;
                  sourcePortTop = portPos.top + lineOffset;
               }

               ui.helper.addClass( portType ).show();
               jqLinkGhost.attr( "class", basicLinkClass + portType ).show();

               // console.log( ui.helper )
            }

            function handlePortDrag( event, ui ) {
               var pos = ui.position;
               jqLinkGhost.attr( "d", svgLinePath( sourcePortLeft, sourcePortTop, pos.left + 10, pos.top + 10 ) );
            }

            function handleDrop() {
               jqPortGhost.removeClass( portType );
               jqLinkGhost.attr( "class", basicLinkClass ).hide();
            }

         }
      };

   } );

   //////////////////////////////////////////////////////////////////////////////////////////////////////////

   module.directive( 'nbeLink', function createLinkDirective() {
      return {
         restrict: 'A',
         controller: function LinkController( $scope, $element ) {

         }
      }
   } );

   //////////////////////////////////////////////////////////////////////////////////////////////////////////


   return module;

} );
