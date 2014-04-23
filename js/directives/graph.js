define( [
   'underscore',
   'jquery',
   'angular',
   '../utilities/async'
],
function ( _, $, ng, async, undefined ) {
   'use strict';

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   var DIRECTIVE_NAME = 'nbeGraph';

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   /**
    * The Graph directive controller manages the view-model for the underlying graph.
    * It is mainly concerned with creating and maintaining links and their controllers.
    * Links are visible connections that represent multi-edge membership.
    * Each link has one end at a vertex node's port (input or output) and one end at an edge node.
    */
   function createGraphDirective( $timeout ) {

      function GraphController( $scope, $element ) {

         /** Shorthands to $scope.* */
         var model;
         var layout;
         var view;

         /** Transient information about links. */
         var links;
         var linksByEdge;
         var linksByVertex;
         var linkControllers;

         var nextLinkId;
         var nextEdgeId;

         var self = $scope.nbeGraph = this;

         /** Provide access to the jQuery handle to the graph canvas element */
         var jqGraph = this.jqGraph = $( $element[ 0 ] );

         initGraph( $scope );

         /** When port/link ghosts are dropped, the most recent drop target can be accessed here. */
         this.dropInfo = { nodeId: null, portId: null };

         /** While a port is being dragged, it can be accessed here. */
         this.dragState = { nodeId: null, port: null };

         // Controller API:
         this.linkByPort = linkByPort;
         this.vertexLinkControllers = vertexLinkControllers;
         this.edgeLinkControllers = edgeLinkControllers;

         this.connectPortFromEdge = connectPortFromEdge;
         this.connectPortToEdge = connectPortToEdge;
         this.connectPortToPort = connectPortToPort;
         this.disconnect = disconnect;

         this.selectEdge = selectEdge;

         this.setDragState = function( nodeId, port ) {
            this.dragState.nodeId = nodeId;
            this.dragState.port = port;
            this.jqGraph.addClass( 'highlight-' + port.type );
            this.jqGraph.addClass( 'highlight-' + ( port.direction === 'in' ? 'out' : 'in' ) );
         };

         this.clearDragState = function() {
            this.jqGraph.removeClass( 'highlight-' + this.dragState.port.type );
            this.jqGraph.removeClass( 'highlight-' + ( this.dragState.port.direction === 'in' ? 'out' : 'in' ) );
         };

         ////////////////////////////////////////////////////////////////////////////////////////////////////////

         function idGen( prefix, currentMap ) {
            var prefixLength = prefix ? prefix.length : 0;
            var maxIndex = Object.keys( currentMap )
               .filter( function( k ) { return k.indexOf( prefix ) === 0; } )
               .map( function( k ) { return parseInt( k.substring( prefixLength ), 10 ); } )
               .reduce( function max( a, b ) { return a > b ? a : b; }, -1 );

            return function nextId() {
               ++maxIndex;
               return prefix + maxIndex;
            }
         }

         ////////////////////////////////////////////////////////////////////////////////////////////////////////

         function repaint() {
            $scope.canvas = {
               width: jqGraph.width(),
               height: jqGraph.height()
            };

            ng.forEach( linkControllers, function( controller ) {
               controller.repaint();
            } );
         }

         $( window ).on( 'resize', async.repeatAfter( _.debounce( repaint, 20 ), $timeout, 20 ) );

         ////////////////////////////////////////////////////////////////////////////////////////////////////////

         function initGraph( $scope ) {

            model = $scope.model;
            layout = $scope.layout;
            view = $scope.view;

            view.links = links = { };
            $scope.selection = {
               /** {String} One of "EDGE", "VERTEX", "LINK" */
               kind: null,
               /** {String} The ID of the selected element */
               id: null
            };
            linksByEdge = { };
            linksByVertex = { };
            self.linkControllers = linkControllers = { };

            nextLinkId = idGen( 'lnk', links );
            nextEdgeId = idGen( 'e', model.edges );

            ng.forEach( model.vertices, function( vertex, vertexId ) {
               vertex.ports.forEach( function( port ) {
                  if ( !port.edgeId ) {
                     return;
                  }
                  if ( port.direction === 'in' ) {
                     createLink( port.edgeId, null, vertexId, port );
                  }
                  else {
                     createLink( vertexId, port, port.edgeId, null );
                  }
               } );
            } );

            repaint();
         }

         ////////////////////////////////////////////////////////////////////////////////////////////////////////

         function connectPortFromEdge( vertexId, port, edgeId ) {
            if ( port.type !== model.edges[ edgeId ].type ) {
               return;
            }
            $scope.$apply( function() {
               port.edgeId = edgeId;
               createLink( edgeId, null, vertexId, port );
            } );
         }

         ////////////////////////////////////////////////////////////////////////////////////////////////////////

         function connectPortToEdge( vertexId, port, edgeId ) {
            if ( port.type !== model.edges[ edgeId ].type ) {
               return;
            }
            $scope.$apply( function() {
               port.edgeId = edgeId;
               createLink( vertexId, port, edgeId, null );
            } );
         }

         ////////////////////////////////////////////////////////////////////////////////////////////////////////

         function connectPortToPort( sourceVertexId, sourcePort, destVertexId, destPort ) {
            if ( sourcePort.type !== destPort.type || sourcePort.direction === destPort.direction ) {
               return;
            }
            disconnect( sourceVertexId, sourcePort );
            disconnect( destVertexId, destPort );
            $scope.$apply( function() {
               var edgeId = createEdge( sourceVertexId, sourcePort, destVertexId, destPort );
               sourcePort.edgeId = edgeId;
               destPort.edgeId = edgeId;
            } );
         }

         ////////////////////////////////////////////////////////////////////////////////////////////////////////

         /** Delete the link at this port, if there is one. */
         function disconnect( vertexId, port ) {
            if ( !port.edgeId ) {
               return;
            }

            var edgeId = port.edgeId;
            var link = linkByPort( vertexId, port );

            $scope.$apply( function() {
               destroyLink( link );
               delete port.edgeId;
               if ( !Object.keys( linksByEdge[ edgeId ] ).length ) {
                  delete model.edges[ edgeId ];
               }
            } );
         }

         ////////////////////////////////////////////////////////////////////////////////////////////////////////

         function createLink( sourceNodeId, sourcePort, destNodeId, destPort ) {
            var link = {
               id: nextLinkId(),
               type: ( sourcePort || destPort ).type,
               source: { nodeId: sourceNodeId, portId: sourcePort && sourcePort.id },
               dest: { nodeId: destNodeId, portId: destPort && destPort.id }
            };
            function add( map, outerKey, innerKey, value ) {
               if ( map[ outerKey ] === undefined ) {
                  map[ outerKey ] = { };
               }
               map[ outerKey ][ innerKey ] = value;
            }
            add( sourcePort ? linksByVertex : linksByEdge, sourceNodeId, link.id, link );
            add( destPort   ? linksByVertex : linksByEdge, destNodeId,   link.id, link );
            links[ link.id ] = link;
         }

         ////////////////////////////////////////////////////////////////////////////////////////////////////////

         function createEdge( sourceVertexId, sourcePort, destVertexId, destPort ) {
            var id = nextEdgeId();
            var type = sourcePort.type;
            model.edges[ id ] = {
               type: type,
               label: type + ' ' + id
            };
            var sourceLayout =  layout.vertices[ sourceVertexId ];
            var destLayout =  layout.vertices[ destVertexId ];
            var centerX = ( parseFloat( sourceLayout.left ) + parseFloat( destLayout.left ) ) / 2;
            var centerY = ( parseFloat( sourceLayout.top ) + parseFloat( destLayout.top ) ) / 2;
            layout.edges[ id ] = { left: centerX, top: centerY };
            createLink( sourceVertexId, sourcePort, id, null, type );
            createLink( id, null, destVertexId, destPort, type );
            return id;
         }

         ////////////////////////////////////////////////////////////////////////////////////////////////////////

         function destroyLink( link ) {
            function remove( map, outerKey, innerKey ) {
               delete map[ outerKey ][ innerKey ];
            }
            remove( link.source.portId ? linksByVertex : linksByEdge, link.source.nodeId, link.id );
            remove( link.dest.portId   ? linksByVertex : linksByEdge, link.dest.nodeId,   link.id );
            delete links[ link.id ];
         }

         ////////////////////////////////////////////////////////////////////////////////////////////////////////

         function vertexLinkControllers( vertexId ) {
            if( linksByVertex[ vertexId ] === undefined ) {
               return [ ];
            }
            return _.map( linksByVertex[ vertexId ], function( link, linkId ) {
               return linkControllers[ linkId ];
            } );
         }

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         function edgeLinkControllers( edgeId ) {
            if ( linksByEdge[ edgeId ] === undefined ) {
               return [ ];
            }
            return _.map( linksByEdge[ edgeId ], function( link, linkId ) {
               return linkControllers[ linkId ];
            } );
         }

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         function linkByPort( vertexId, port ) {
            var links = linksByVertex[ vertexId ];
            var keys = Object.keys( links );
            for ( var i = keys.length; i --> 0; ) {
               var linkId = keys[ i ];
               var link = links[ linkId ];
               if( link.source.portId === port.id || link.dest.portId === port.id ) {
                  return links[ linkId ];
               }
            }
            return null;
         }

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         function clearSelection() {
            $scope.selection.id = null;
            $scope.selection.kind = null;
            $( document ).off( 'keyup', handleKeys );
         }

         function selectEdge( edgeId ) {
            $scope.selection.id = edgeId;
            $scope.selection.kind = 'EDGE';
            $( document ).on( 'keyup', handleKeys );
         }

         function handleKeys( event ) {
            var DELETE = 46;
            if ( event.keyCode === DELETE ) {
               if ( $scope.selection.kind === 'EDGE' ) {
                  deleteEdge( $scope.selection.id );
               }
            }
            event.preventDefault();
         }

         function deleteEdge( edgeId ) {
            ng.forEach( model.vertices, function( vertex, vertexId ) {
               vertex.ports.forEach( function( port ) {
                  if( port.edgeId === edgeId ) {
                     disconnect( vertexId, port );
                  }
               } );
            } );
         }
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      return {
         restrict: 'A',
         /**
          * @type {{
          *    model: {edges: Object, vertices: {ports: {in: Object, out: Object}}},
          *    layout: Object,
          *    view: Object
          * }}
          */
         controller: GraphController
      };
   }


   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   return {
      define: function( module ) {
         module.directive( DIRECTIVE_NAME, [ '$timeout', createGraphDirective ] );
         module.filter( 'nbeInputPorts', function() {
            return function( ports ) {
               return ports.filter( function( _ ) { return _.direction === 'in'; } );
            }
         } );
         module.filter( 'nbeOutputPorts', function() {
            return function( ports ) {
               return ports.filter( function( _ ) { return _.direction !== 'in'; } );
            }
         } );
      }
   };

} );