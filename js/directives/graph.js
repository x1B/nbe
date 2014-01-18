define( [
   'underscore',
   'jquery',
   'jquery.ui',
   'angular'
],
function ( _, $, jqueryUi, ng, undefined ) {
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

      function initGraph( $scope ) {

         model = $scope.model;
         layout = $scope.layout;
         view = $scope.view;

         links = { };
         linksByEdge = { };
         linksByVertex = { };
         self.linkControllers = linkControllers = { };

         nextLinkId = 0;
         nextEdgeId = Object.keys( model.edges ).length + 1;


         ng.forEach( model.vertices, function( vertex, vertexId ) {
            ng.forEach( vertex.ports.in, function( port, portId ) {
               if( port.edge ) {
                  createLink( port.edge, null, vertexId, portId, port.type );
               }
            } );
            ng.forEach( vertex.ports.out, function( port, portId ) {
               if( port.edge ) {
                  createLink( vertexId, portId, port.edge, null, port.type );
               }
            } );
         } );

         view.links = links;
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function connectPortFromEdge( vertexId, portId, port, edgeId ) {
         $scope.$apply( function() {
            port.edge = edgeId;
            createLink( edgeId, null, vertexId, portId, port.type );
         } );
      }

      function connectPortToEdge( vertexId, portId, port, edgeId ) {
         $scope.$apply( function() {
            port.edge = edgeId;
            createLink( vertexId, portId, edgeId, null, port.type );
         } );
      }

      function connectPortToPort( sourceVertexId, sourcePortId, sourcePort, destVertexId, destPortId, destPort ) {
         var sourcePort = sourcePort || model.vertices[ sourceVertexId ].ports.out[ sourcePortId ];
         var destPort   = destPort   || model.vertices[ destVertexId ].ports.in[ destPortId ];
         disconnect( sourceVertexId, sourcePortId, sourcePort );
         disconnect( destVertexId, destPortId, destPort );
         $scope.$apply( function() {
            var edgeId = createEdge( sourceVertexId, sourcePortId, destVertexId, destPortId, destPort.type );
            sourcePort.edge = edgeId;
            destPort.edge = edgeId;
         } );
      }

      /** delete any existing link at this port */
      function disconnect( vertexId, portId, port ) {
         if ( !port.edge ) {
            return;
         }

         var edgeId = port.edge;
         var link = linkByPort( vertexId, portId );
         $scope.$apply( function() {
            destroyLink( link );
            delete port.edge;
            if ( !Object.keys( linksByEdge[ edgeId ] ).length ) {
               delete model.edges[ edgeId ];
            };
         } );
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function createLink( sourceNodeId, sourcePortId, destNodeId, destPortId, type ) {
         var link = {
            id: nextLinkId++,
            type: type,
            source: { node: sourceNodeId, port: sourcePortId },
            dest: { node: destNodeId, port: destPortId }
         };
         function add( map, outerKey, innerKey, value ) {
            if ( map[ outerKey ] === undefined ) {
               map[ outerKey ] = { };
            }
            map[ outerKey ][ innerKey ] = value;
         }
         add( sourcePortId ? linksByVertex : linksByEdge, sourceNodeId, link.id, link );
         add( destPortId   ? linksByVertex : linksByEdge, destNodeId,   link.id, link );
         console.log( 'link', link.id, 'created. linksByVertex:', linksByVertex );
         links[ link.id ] = link;
      }

      function createEdge( sourceVertexId, sourcePortId, destVertexId, destPortId, type ) {
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
         createLink( sourceVertexId, sourcePortId, id, null, type );
         createLink( id, null, destVertexId, destPortId, type );
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

      function linkByPort( vertexId, portId ) {
         var links = linksByVertex[ vertexId ];
         for( var linkId in links ) {
            if( links.hasOwnProperty( linkId ) ) {
               var link = links[ linkId ];
               if( link.source.port === portId || link.dest.port === portId ) {
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