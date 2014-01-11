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
    * The Graph directive controller manages the view-model for the underlying graph.
    * It is mainly concerned with creating and maintaining links and their controllers.
    * Links are visible connections that represent multi-edge membership.
    * Each link has one end at a vertex node's port (input or output) and one end at an edge node.
    */
   function createGraphDirective() {

      return {
         restrict: 'A',
         controller: function GraphController( $scope, $element ) {
            var links = { };

            var linksByEdge = { };
            var linksByVertex = { };

            // nbeLink directives register themselves here
            var linkControllers = { };

            var nextLinkId = 0;

            ng.forEach( $scope.model.vertices, function( vertex, vertexId ) {
               ng.forEach( vertex.ports.in, function( port, portId ) {
                  if( port.edge )
                     createLink( port.edge, null, vertexId, portId, port.type );
               } );
               ng.forEach( vertex.ports.out, function( port, portId ) {
                  if( port.edge )
                     createLink( vertexId, portId, port.edge, null, port.type );
               } );
            } );

            /** Provide access to the jQuery handle to the graph canvas element */
            this.jqGraph = $( $element[ 0 ] );

            /** When link ghosts are dropped, the drop target can be accessed here. */
            this.dropInfo = { node: null, port: null };

            this.linkControllers = linkControllers;
            this.linkByPort = linkByPort;
            this.vertexLinkControllers = vertexLinkControllers;
            this.edgeLinkControllers = edgeLinkControllers;
            this.createLink = createLink;
            this.deleteLink = deleteLink;
            this.connectFromEdge = connectFromEdge;
            this.connectToEdge = connectToEdge;
            this.disconnect = disconnect;

            /** View-Model to represent links between edges and vertices. */
            $scope.view.links = links;

            $scope.nbeGraph = this;

            //////////////////////////////////////////////////////////////////////////////////////////////////

            function createLink( sourceNode, sourcePort, destNode, destPort, type ) {
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
               // console.log( 'link', link.id, 'created. linksByVertex:', linksByVertex );
               links[ link.id ] = link;
            }

            //////////////////////////////////////////////////////////////////////////////////////////////////

            function deleteLink( link ) {
               function remove( map, outerKey, innerKey ) {
                  delete map[ outerKey ][ innerKey ];
               }
               remove( link.source.port ? linksByVertex : linksByEdge, link.source.node, link.id );
               remove( link.dest.port   ? linksByVertex : linksByEdge, link.dest.node,   link.id );
               $scope.$apply( function() {
                  delete links[ link.id ];
               } );
            }

            //////////////////////////////////////////////////////////////////////////////////////////////////

            function connectFromEdge( vertexId, portId, port, edgeId ) {
               $scope.$apply( function() {
                  port.edge = edgeId;
                  createLink( edgeId, null, vertexId, portId, port.type );
               } );
            }

            function connectToEdge( vertexId, portId, port, edgeId ) {
               $scope.$apply( function() {
                  port.edge = edgeId;
                  createLink( vertexId, portId, edgeId, null, port.type );
               } );
            }

            //////////////////////////////////////////////////////////////////////////////////////////////////

            function disconnect( vertexId, portId, port ) {
               // delete any existing link from this port
               if ( !port.edge ) return;
               var link = linkByPort( vertexId, portId );
               deleteLink( link );
               $scope.$apply( function() {
                  delete port.edge;
               } );
            }

            //////////////////////////////////////////////////////////////////////////////////////////////////

            function vertexLinkControllers( vertexId ) {
               if( linksByVertex[ vertexId ] === undefined ) {
                  return [ ];
               }
               return _.map( linksByVertex[ vertexId ], function( link, linkId ) {
                  return linkControllers[ linkId ];
               } );
            }

            //////////////////////////////////////////////////////////////////////////////////////////////////

            function edgeLinkControllers( edgeId ) {
               if ( linksByEdge[ edgeId ] === undefined ) return [ ];
               return _.map( linksByEdge[ edgeId ], function( link, linkId ) {
                  return linkControllers[ linkId ];
               } );
            }

            //////////////////////////////////////////////////////////////////////////////////////////////////

            function linkByPort( vertexId, portId ) {
               var links = linksByVertex[ vertexId ];
               for( var linkId in links ) {
                  var link = links[ linkId ];
                  if( link.source.port === portId || link.dest.port === portId ) {
                     return links[ linkId ];
                  }
               }
            }

            //////////////////////////////////////////////////////////////////////////////////////////////////

         }
      };

   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   return {
      define: function( module ) {
         module.directive( DIRECTIVE_NAME, createGraphDirective );
      }
   };

} );