define( [
   'underscore',
   'jquery',
   'jquery.ui',
   'angular',
   'dummy_data'
],
function ( _, $, jqueryUi, ng, data, undefined ) {
   "use strict";

   // :TODO: calculate from stylesheet
   var EDGE_OFFSET = 15;
   var PORT_OFFSET = 8;

   // noinspection JSCheckFunctionSignatures
   var module = ng.module( 'GraphWidget', [ ] );

   //////////////////////////////////////////////////////////////////////////////////////////////////////////

   var round = Math.round;
   function svgLinePath( fromLeft, fromTop, toLeft, toTop ) {
      return [ 'M', round( fromLeft ), ' ', round( fromTop ),
               ' L', round( toLeft ), ' ', round( toTop ) ].join('');
   }

   function svgCubicBezierPath( fromLeft, fromTop, toLeft, toTop ) {
      // todo
   }

   var svgConnectPath = svgLinePath;

   //////////////////////////////////////////////////////////////////////////////////////////////////////////

   var nextLinkId = 0;
   function createLink( sourceNode, sourcePort, destNode, destPort, type ) {
      return {
         id: nextLinkId++,
         type: type,
         source: { node: sourceNode, port: sourcePort },
         dest: { node: destNode, port: destPort }
      };
   }

   //////////////////////////////////////////////////////////////////////////////////////////////////////////

   function GraphWidget( $scope ) {
      var model = $scope.model = data.get( 'dummyModel' );
      var layout = $scope.layout = data.get( 'dummyLayout' );
      var links = layout.links = { };

      // must be changed to linksByVertex + linksByEdge...
      var linksByEdge = $scope.linksByEdge = { };
      var linksByVertex = $scope.linksByVertex = { };

      function insertLink( sourceNode, sourcePort, destNode, destPort, type ) {
         var link = createLink( sourceNode, sourcePort, destNode, destPort, type );
         function add( map, key, value ) {
            if ( map[ key ] === undefined ) map[ key ] = [];
            map[ key ].push( value );
         }
         links[ link.id ] = link;
         add( sourcePort ? linksByVertex : linksByEdge, sourceNode, link.id );
         add( destPort ? linksByVertex : linksByEdge, destNode, link.id );
      }

      ng.forEach( model.vertices, function( vertex, vertexId ) {
         ng.forEach( vertex.ports.in, function( port, portId ) {
            if ( port.edge )
               insertLink( port.edge, null, vertexId, portId, port.type );
         } );
         ng.forEach( vertex.ports.out, function( port, portId ) {
            if ( port.edge )
               insertLink( vertexId, portId, port.edge, null, port.type );
         } );
      } );

      console.log( 'links by edge:', linksByEdge );
      console.log( 'scope:', $scope );
   }

   GraphWidget.$inject = [ '$scope' ];

   // noinspection JSUnusedGlobalSymbols
   module.controller( 'GraphWidget', GraphWidget );

   //////////////////////////////////////////////////////////////////////////////////////////////////////////

   module.directive( 'nbeGraph', function createGraphDirective() {

      return {
         restrict: 'A',
         controller: function VertexController( $scope, $element ) {
            this.jqGraph = $( $element[ 0 ] );
            var linkControllers = this.linkControllers = {};

            this.vertexLinkControllers = function vertexLinkControllers( vertexId ) {
               if ( $scope.linksByVertex[ vertexId ] === undefined ) return [ ];
               return _.map( $scope.linksByVertex[ vertexId ], function( link ) {
                  return linkControllers[ link ];
               } );
            }

            this.edgeLinkControllers = function edgeLinkControllers( edgeId ) {
               if ( $scope.linksByEdge[ edgeId ] === undefined ) return [ ];
               return _.map( $scope.linksByEdge[ edgeId ], function( link ) {
                  return linkControllers[ link ];
               } );
            }

            $scope.nbeGraph = this;
         }
      };

   } );

   //////////////////////////////////////////////////////////////////////////////////////////////////////////

   module.directive( 'nbeEdge', function createVertexDirective() {
      return {
         restrict: 'A',
         controller: function EdgeController( $scope, $element ) {

            var graphController = $scope.nbeGraph;
            var edge = $scope.edge;
            var id = $scope.edgeId;

            $( $element[ 0 ] ).draggable( {
               stack: '.graph *',
               containment: 'parent',
               start: handleEdgeDragStart,
               drag: handleEdgeDrag,
               stop: handleEdgeDrop
            } );

            var linkControllers = [];
            function handleEdgeDragStart( event, ui ) {
               linkControllers = graphController.edgeLinkControllers( id );
               console.log( 'controllers:', linkControllers );
            }

            function handleEdgeDrag( event, ui ) {
               ng.forEach( linkControllers, function( linkController ) {
                  linkController.updatePath();
               } );
            }

            function handleEdgeDrop() {
               linkControllers = [];
            }

            this.jqGraph = $( $element[ 0 ].parentNode );
         }
      };
   } );

   //////////////////////////////////////////////////////////////////////////////////////////////////////////

   module.directive( 'nbeVertex', function createVertexDirective() {
      return {
         restrict: 'A',
         controller: function VertexController( $scope, $element ) {

            var graphController = $scope.nbeGraph;
            var vertex = $scope.vertex;
            var id = $scope.vertexId;

            $( $element[ 0 ] ).draggable( {
               stack: '.graph *',
               containment: 'parent',
               start: handleVertexDragStart,
               drag: handleVertexDrag,
               stop: handleVertexDrop
            } );

            var linkControllers = [];
            function handleVertexDragStart( event, ui ) {
               linkControllers = graphController.vertexLinkControllers( id );
            }

            function handleVertexDrag( event, ui ) {
               ng.forEach( linkControllers, function( linkController ) {
                  linkController.updatePath();
               } );
            }

            function handleVertexDrop() {
               linkControllers = [];
            }

            this.jqGraph = $( $element[ 0 ].parentNode );
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
               stop: handlePortDrop,
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
               jqLinkGhost.attr( "d", svgConnectPath( sourcePortLeft, sourcePortTop, pos.left + PORT_OFFSET, pos.top + PORT_OFFSET ) );
            }

            function handlePortDrop() {
               jqPortGhost.removeClass( portType );
               jqLinkGhost.attr( "class", basicLinkClass ).hide();
            }

         }
      };

   } );

   //////////////////////////////////////////////////////////////////////////////////////////////////////////

   module.directive( 'nbeLink', [ '$timeout', function createLinkDirective( $timeout ) {

      return {
         restrict: 'A',
         controller: function LinkController( $scope, $element ) {
            console.log( 'link/path:', $scope.link, $element );

            // ngClass does not work with SVG
            var basicLinkClass = $element.attr( "class" );
            $element.attr( "class", basicLinkClass + " " + $scope.link.type );

            var graphController = $scope.nbeGraph;
            graphController.linkControllers[ $scope.link.id ] = this;
            var jqGraph = graphController.jqGraph;
            var graphOffset = jqGraph.offset();

            var source = $scope.link.source;
            var dest = $scope.link.dest;

            var jqSourceNode, jqSourceHandle;
            var jqDestNode, jqDestHandle;

            var from = [ 0, 0 ];
            var to = [ 0, 0 ];

            function jqVertexPlusHandle( portInfo ) {
               // console.log( 'Looking for node', portInfo.node );
               var jqNode = $( '[data-nbe-vertex="' + portInfo.node + '"]', jqGraph );
               var jqHandle = $( '[data-nbe-port="' + portInfo.port + '"] i', jqNode );
               // console.log( 'Node: ', jqSourceNode.get(0) );
               // console.log( 'Port: ', jqSourcePort.get(0) );
               return [ jqNode, jqHandle ];
            }

            function jqEdge( portInfo ) {
               return $( '[data-nbe-edge="' + portInfo.node + '"]', jqGraph );
            }

            function center( jqNode, jqHandle, coords ) {
               if ( jqHandle ) {
                  var p = jqHandle.offset();
                  coords[ 0 ] = p.left - graphOffset.left + PORT_OFFSET;
                  coords[ 1 ] = p.top - graphOffset.top + PORT_OFFSET;
               }
               else {
                  var n = jqNode.offset();
                  coords[ 0 ] = n.left - graphOffset.left + EDGE_OFFSET;
                  coords[ 1 ] = n.top - graphOffset.left + EDGE_OFFSET;
               }
               // console.log( 'Center(%o, %o): ', jqNode.data( 'nbeVertex' ) || jqNode.data( 'nbeEdge' ), jqHandle && jqHandle.data( 'nbePort' ), coords );
               return center
            }

            function updatePath() {
               center( jqSourceNode, jqSourceHandle, from );
               center( jqDestNode, jqDestHandle, to );
               $element.attr( 'd', svgConnectPath( from[ 0 ], from[ 1 ], to[ 0 ], to[ 1 ] ) );
            }
            this.updatePath = updatePath;

            function init() {

               if ( source.port ) {
                  var jqSourceInfo = jqVertexPlusHandle( source );
                  jqSourceNode = jqSourceInfo[0];
                  jqSourceHandle = jqSourceInfo[1];
               }
               else {
                  jqSourceNode = jqEdge( source );
                  jqSourceHandle = null;
               }

               if ( dest.port ) {
                  var jqDestInfo = jqVertexPlusHandle( dest );
                  jqDestNode = jqDestInfo[0];
                  jqDestHandle = jqDestInfo[1];
               }
               else {
                  jqDestNode = jqEdge( dest );
                  jqDestHandle = null;
               }

               // console.log( "SN: ", jqSourceNode, jqSourcePort );
               // console.log( "DN: ", jqDestNode, jqDestPort );
               updatePath();
            }

            $timeout( init, 50 );
         }
      }
   } ] );

   //////////////////////////////////////////////////////////////////////////////////////////////////////////


   return module;

} );
