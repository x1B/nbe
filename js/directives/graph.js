define( [
   'underscore',
   'jquery',
   'angular'
],
function ( _, $, ng, undefined ) {
   'use strict';

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   var DIRECTIVE_NAME = 'nbeGraph';

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   /**
    * @type {{
    *    model: {edges: Object, vertices: {ports: {in: Object, out: Object}}},
    *    layout: Object,
    *    view: Object
    * }}
    */
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
      /** TODO: scan for or use the highest number actually used so far. */
      var nextEdgeId;

      var self = $scope.nbeGraph = this;
      initGraph( $scope );

      /** Provide access to the jQuery handle to the graph canvas element */
      this.jqGraph = $( $element[ 0 ] );

      /** When link ghosts are dropped, the drop target can be accessed here. */
      this.dropInfo = { nodeId: null, portId: null };

      this.linkByPort = linkByPort;
      this.vertexLinkControllers = vertexLinkControllers;
      this.edgeLinkControllers = edgeLinkControllers;
      this.connectPortFromEdge = connectPortFromEdge;
      this.connectPortToEdge = connectPortToEdge;
      this.connectPortToPort = connectPortToPort;
      this.disconnect = disconnect;


      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function idGen( prefix, currentMap ) {
         console.log( 'starting idGen for ', prefix, 'content: ', currentMap );
         var prefixLength = prefix ? prefix.length : 0;
         var maxIndex = Object.keys( currentMap )
            .filter( function( k ) {
               return k.indexOf( prefix ) === 0;
            } )
            .map( function( k ) {
               var index = parseInt( k.substring( prefixLength ), 10 );
               return isNaN( index ) ? -1 : index;
            } )
            .reduce( Math.max, -1 );


         return function nextId() {
            ++maxIndex;
            return prefix + maxIndex;
         }
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function initGraph( $scope ) {

         model = $scope.model;
         layout = $scope.layout;
         view = $scope.view;

         view.links = links = { };
         linksByEdge = { };
         linksByVertex = { };
         self.linkControllers = linkControllers = { };

         nextLinkId = idGen( 'lnk', links );
         nextEdgeId = idGen( 'e', model.edges );

         ng.forEach( model.vertices, function( vertex, vertexId ) {
            vertex.ports.in.forEach( function( port ) {
               if ( port.edgeId ) {
                  console.log( 'creating in-link for edge ', port.edgeId );
                  createLink( port.edgeId, null, vertexId, port );
               }
            } );
            vertex.ports.out.forEach( function( port ) {
               if ( port.edgeId ) {
                  createLink( vertexId, port, port.edgeId, null );
               }
            } );
         } );
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function connectPortFromEdge( vertexId, port, edgeId ) {
         $scope.$apply( function() {
            port.edgeId = edgeId;
            createLink( edgeId, null, vertexId, port );
         } );
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function connectPortToEdge( vertexId, port, edgeId ) {
         $scope.$apply( function() {
            port.edgeId = edgeId;
            createLink( vertexId, port, edgeId, null );
         } );
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function connectPortToPort( sourceVertexId, sourcePort, destVertexId, destPort ) {
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
         console.log( 'disconnect edge', edgeId, ' from port ', vertexId + '#' + port.id );
         var link = linkByPort( vertexId, port );
         console.log( '...link: ', link, ' among ', linksByVertex[ vertexId ] );

         $scope.$apply( function() {
            destroyLink( link );
            delete port.edgeId;
            console.log( 'links remaining with edge ', edgeId, ': ', linksByEdge[ edgeId ] );
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
         console.log( 'link', link.id, 'created. linksByVertex:', linksByVertex );
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
         var sourceVertex =  layout.vertices[ sourceVertexId ];
         var destVertex =  layout.vertices[ destVertexId ];
         var centerX = ( parseInt( sourceVertex.left ) + parseInt( destVertex.left ) ) / 2;
         var centerY = ( parseInt( sourceVertex.top ) + parseInt( destVertex.top ) ) / 2;
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

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function edgeLinkControllers( edgeId ) {
         if ( linksByEdge[ edgeId ] === undefined ) {
            return [ ];
         }
         return _.map( linksByEdge[ edgeId ], function( link, linkId ) {
            return linkControllers[ linkId ];
         } );
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function linkByPort( vertexId, port ) {
         var links = linksByVertex[ vertexId ];
         console.log( 'args:', arguments, 'links', links );
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

   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   /**
    * The Graph directive controller manages the view-model for the underlying graph.
    * It is mainly concerned with creating and maintaining links and their controllers.
    * Links are visible connections that represent multi-edge membership.
    * Each link has one end at a vertex node's port (input or output) and one end at an edge node.
    */
   function createGraphDirective() {
      return {
         restrict: 'A',
         controller: GraphController
      };
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   return {
      define: function( module ) {
         module.directive( DIRECTIVE_NAME, createGraphDirective );
      }
   };

} );