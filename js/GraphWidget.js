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

   function GraphWidget( $scope ) {
      var model = $scope.model = data.get( 'dummyModel' );
      var layout = $scope.layout = data.get( 'dummyLayout' );
      var view = $scope.view = { links: { } };
   }

   GraphWidget.$inject = [ '$scope' ];

   module.controller( 'GraphWidget', GraphWidget );

   //////////////////////////////////////////////////////////////////////////////////////////////////////////

   /**
    * The Graph directive controller manages the view-model for the underlying graph.
    * It is mainly concerned with creating and maintaining links and their controllers.
    * Links are visible connections that represent graph multi-edge membership.
    * Each link has one end at a vertex node's port (input or output) and one end at an edge node.
    */
   module.directive( 'nbeGraph', function createGraphDirective() {

      return {
         restrict: 'A',
         controller: function VertexController( $scope, $element ) {
            var links = $scope.view.links = { };

            var linksByEdge = { };
            var linksByVertex = { };

            // console.log( 'links by edge:', linksByEdge );

            this.jqGraph = $( $element[ 0 ] );

            // nbeLink directives register themselves here
            var linkControllers = this.linkControllers = { };

            var nextLinkId = 0;
            var createLink = this.createLink = function createLink( sourceNode, sourcePort, destNode, destPort, type ) {
               var link = {
                  id: nextLinkId++,
                  type: type,
                  source: { node: sourceNode, port: sourcePort },
                  dest: { node: destNode, port: destPort }
               };
               function add( map, outerKey, innerKey, value ) {
                  if ( map[ outerKey ] === undefined ) map[ outerKey ] = { };
                  map[ outerKey ][ innerKey ] = value;
               }
               add( sourcePort ? linksByVertex : linksByEdge, sourceNode, link.id, link );
               add( destPort   ? linksByVertex : linksByEdge, destNode,   link.id, link );
               console.log( 'link', link.id, 'created. linksByVertex:', linksByVertex );
               links[ link.id ] = link;
            };

            this.deleteLink = function deleteLink( link ) {
               function remove( map, outerKey, innerKey ) {
                  delete map[ outerKey ][ innerKey ];
               }
               remove( link.source.port ? linksByVertex : linksByEdge, link.source.node, link.id );
               remove( link.dest.port   ? linksByVertex : linksByEdge, link.dest.node,   link.id );
               $scope.$apply(function() {
                  delete $scope.view.links[ link.id ];
               } );
            };

            this.vertexLinkControllers = function vertexLinkControllers( vertexId ) {
               if ( linksByVertex[ vertexId ] === undefined ) return [ ];
               return _.map( linksByVertex[ vertexId ], function( link, linkId ) {
                  return linkControllers[ linkId ];
               } );
            };

            this.edgeLinkControllers = function edgeLinkControllers( edgeId ) {
               if ( linksByEdge[ edgeId ] === undefined ) return [ ];
               return _.map( linksByEdge[ edgeId ], function( link, linkId ) {
                  return linkControllers[ linkId ];
               } );
            };

            this.linkByPort = function linkByPort( vertexId, portId ) {
               var links = linksByVertex[ vertexId ];
               for ( var linkId in links ) {
                  var link = links[ linkId ];
                  if ( link.source.port === portId || link.dest.port === portId ) {
                     return links[ linkId ];
                  }
               }
            };

            ng.forEach( $scope.model.vertices, function( vertex, vertexId ) {
               ng.forEach( vertex.ports.in, function( port, portId ) {
                  if ( port.edge )
                     createLink( port.edge, null, vertexId, portId, port.type );
               } );
               ng.forEach( vertex.ports.out, function( port, portId ) {
                  if ( port.edge )
                     createLink( vertexId, portId, port.edge, null, port.type );
               } );
            } );

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
               console.log( linkControllers );
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

            var port = $scope.port;
            var portType = port.type || '';
            // console.log( $scope.port.label, $( 'i', $element[0] )[0], $scope.port.type );

            var graphController = $scope.nbeGraph;
            var jqGraph = graphController.jqGraph;
            var jqPortGhost = $( '.port.GHOST', jqGraph );
            var jqLinkGhost= $( '.link.GHOST', jqGraph );

            // Drag starting position, relative to graph canvas.
            var fromLeft, fromTop;
            var graphOffset;

            $( 'i', $element[0] ).draggable( {
               opacity: 0.8,
               helper: function() {
                  return $( '.GHOST.port', jqGraph ).clone().show();
               },
               zIndex: 1000,
               start: handlePortDragStart,
               drag: handlePortDrag,
               stop: handlePortDrop,
               addClasses: false,
               appendTo: jqGraph
            } );

            // , cursorAt: { left: 8, top: 8 }

            var basicLinkClass = jqLinkGhost.attr( "class" ) + " ";

            function handlePortDragStart( event, ui ) {
               var jqHandle = $( event.target );

               // delete link from this port
               var link = graphController.linkByPort( $scope.vertexId, $scope.portId );
               if ( link ) graphController.deleteLink( link );

               var p = jqHandle.offset();
               graphOffset = jqGraph.offset();
               fromLeft = p.left - graphOffset.left + PORT_OFFSET;
               fromTop = p.top - graphOffset.top + PORT_OFFSET;

               ui.helper.addClass( portType ).show();
               jqLinkGhost.attr( "class", basicLinkClass + portType ).show();
            }

            function handlePortDrag( event, ui ) {
               var pos = ui.offset;
               var toLeft = pos.left - graphOffset.left + PORT_OFFSET;
               var toTop = pos.top - graphOffset.top + PORT_OFFSET;
               jqLinkGhost.attr( "d", svgConnectPath( fromLeft, fromTop, toLeft, toTop ) );
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
