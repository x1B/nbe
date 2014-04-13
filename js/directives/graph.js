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

      /** Shorthand to $scope.model */
      var model;
      /** Shorthand to $scope.layout */
      var layout;
      /** Shorthand to $scope.view */
      var view;

      /** Transient information about links. */
      var links;
      var linksByEdge;
      var linksByVertex;
      var linkControllers;

      var nextLinkId = 0;
      /** TODO: scan for or use the highest number actually used so far. */
      var nextEdgeId = Object.keys( $scope.model.edges ).length + 1;

      /** View-Model to represent links between edges and vertices. */
      var self = $scope.nbeGraph = this;
      initGraph( $scope );

      /** Provide access to the jQuery handle to the graph canvas element */
      this.jqGraph = $( $element[ 0 ] );

      /** When link ghosts are dropped, the drop target can be accessed here. */
      this.dropInfo = { node: null, port: null };

      this.linkByPort = linkByPort;
      this.vertexLinkControllers = vertexLinkControllers;
      this.edgeLinkControllers = edgeLinkControllers;
      this.connectPortFromEdge = connectPortFromEdge;
      this.connectPortToEdge = connectPortToEdge;
      this.connectPortToPort = connectPortToPort;
      this.disconnect = disconnect;


      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function idGen( prefix, currentMap ) {
         var maxIndex = -1;
         var prefixLength = prefix ? prefix.length : 0;
         ng.forEach( currentMap, function( _, key ) {
            var index = parseInt( key.substring( 0, prefixLength ) );
            if ( index > maxIndex ) {
               maxIndex = index;
            }
         } );

         return function nextId() {
            return ++maxIndex;
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

         nextLinkId = idGen( 'ln', links );
         nextEdgeId = idGen( 'e', model.edges );

         ng.forEach( model.vertices, function( vertex, vertexId ) {
            vertex.ports.in.forEach( function( port ) {
               if( port.edge ) {
                  createLink( port.edge, null, vertexId, port );
               }
            } );
            vertex.ports.out.forEach( function( port ) {
               if( port.edge ) {
                  createLink( vertexId, port, port.edge, null );
               }
            } );
         } );

      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function connectPortFromEdge( vertexId, port, edgeId ) {
         $scope.$apply( function() {
            port.edge = edgeId;
            createLink( edgeId, null, vertexId, port.type );
         } );
      }

      function connectPortToEdge( vertexId, port, edgeId ) {
         $scope.$apply( function() {
            port.edge = edgeId;
            createLink( vertexId, edgeId, null, port.type );
         } );
      }

      function connectPortToPort( sourceVertexId, sourcePort, destVertexId, destPort ) {
         disconnect( sourceVertexId, sourcePort );
         disconnect( destVertexId, destPort );
         $scope.$apply( function() {
            var edgeId = createEdge( sourceVertexId, sourcePort, destVertexId, destPort );
            sourcePort.edge = edgeId;
            destPort.edge = edgeId;
         } );
      }

      /** Delete the link at this port, if there is one. */
      function disconnect( vertexId, port ) {
         if ( !port.edge ) {
            return;
         }

         var edgeId = port.edge;
         var link = linkByPort( vertexId, port );
         $scope.$apply( function() {
            destroyLink( link );
            delete port.edge;
            if ( !Object.keys( linksByEdge[ edgeId ] ).length ) {
               delete model.edges[ edgeId ];
            };
         } );
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function createLink( sourceNodeId, sourcePort, destNodeId, destPort ) {
         var link = {
            id: nextLinkId(),
            type: type,
            source: { node: sourceNodeId, port: sourcePort.id },
            dest: { node: destNodeId, port: destPort.id }
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

      function createEdge( sourceVertexId, sourcePort, destVertexId, destPort ) {
         var id = nextEdgeId++;
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

      function destroyLink( link ) {
         function remove( map, outerKey, innerKey ) {
            delete map[ outerKey ][ innerKey ];
         }
         remove( link.source.port ? linksByVertex : linksByEdge, link.source.node, link.id );
         remove( link.dest.port   ? linksByVertex : linksByEdge, link.dest.node,   link.id );
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

      function edgeLinkControllers( edgeId ) {
         if ( linksByEdge[ edgeId ] === undefined ) {
            return [ ];
         }
         return _.map( linksByEdge[ edgeId ], function( link, linkId ) {
            return linkControllers[ linkId ];
         } );
      }

      function linkByPort( vertexId, port ) {
         var links = linksByVertex[ vertexId ];
         for( var linkId in links ) {
            if( links.hasOwnProperty( linkId ) ) {
               var link = links[ linkId ];
               if( link.source.port === port.id || link.dest.port === port.id ) {
                  return links[ linkId ];
               }
            }
         }
         return null;
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

   }

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