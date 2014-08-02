
/** Manages the view model for links. */
function linksController() {

   var linksByEdge = {};
   var linksByVertex = {};
   var linkControllers = {};

   function createLink( refA, refB ) {
      var reverse = isInput( refA.port ) || isOutput( refB.port );
      var fromRef = reverse ? refB : refA;
      var toRef = reverse ? refA : refB;

      var link = {
         id: generateLinkId(),
         type: ( fromRef.port || toRef.port ).type,
         source: fromRef,
         dest: toRef
      };

      insert( fromRef, link.id, link );
      insert( toRef, link.id, link );
      if( isSimple( link ) ) {
         var edgeId = fromRef.port.edgeId;
         insert( { nodeId: edgeId }, link.id, link );
      }
      view.links[ link.id ] = link;
      return link;

      //////////////////////////////////////////////////////////////////////////////////////////////////

      function insert( ref, linkId, link ) {
         var map = ref.port ? linksByVertex : linksByEdge;
         if( !map[ ref.nodeId ] ) {
            map[ ref.nodeId ] = { };
         }
         map[ ref.nodeId ][ linkId ] = link;
      }

   }

   /////////////////////////////////////////////////////////////////////////////////////////////////////

   function destroyLink( link ) {
      function remove( map, nodeId, linkId ) {
         delete map[ nodeId ][ linkId ];
      }

      remove( link.source.port ? linksByVertex : linksByEdge, link.source.nodeId, link.id );
      remove( link.dest.port ? linksByVertex : linksByEdge, link.dest.nodeId, link.id );
      delete view.links[ link.id ];
   }

   /////////////////////////////////////////////////////////////////////////////////////////////////////

   function controllers( vertexIds, edgeIds ) {
      var result = [];
      ( vertexIds || [] ).forEach( function( vertexId ) {
         vertexLinkControllers( vertexId ).forEach( function( ctr ) {
            result.push( ctr );
         } );
      } );
      ( edgeIds || [] ).forEach( function( edgeId ) {
         edgeLinkControllers( edgeId ).forEach( function( ctr ) {
            result.push( ctr );
         } );
      } );
      return result;
   }

   /////////////////////////////////////////////////////////////////////////////////////////////////////

   function vertexLinkControllers( vertexId ) {
      if( linksByVertex[ vertexId ] === undefined ) {
         return [];
      }
      return Object.keys( linksByVertex[ vertexId ] ).map( function( linkId ) {
         return linkControllers[ linkId ];
      } );
   }

   /////////////////////////////////////////////////////////////////////////////////////////////////////

   function edgeLinkControllers( edgeId ) {
      if( linksByEdge[ edgeId ] === undefined ) {
         return [];
      }
      return Object.keys( linksByEdge[ edgeId ] ).map( function( linkId ) {
         return linkControllers[ linkId ];
      } );
   }

   /////////////////////////////////////////////////////////////////////////////////////////////////////

   function byPort( vertexId, port ) {
      var portId = port.id;
      if( !linksByVertex[ vertexId ] ) {
         linksByVertex[ vertexId ] = {};
      }
      var candidates = linksByVertex[ vertexId ];
      var links = [];
      var keys = Object.keys( candidates );
      for( var i = keys.length; i --> 0; ) {
         var linkId = keys[ i ];
         var link = candidates[ linkId ];
         if( link.source.nodeId === vertexId && link.source.port.id === portId ) {
            links.push( link );
         }
         if( link.dest.nodeId === vertexId && link.dest.port.id === portId ) {
            links.push( link );
         }
      }
      return links;
   }

   return {
      create: createLink,
      destroy: destroyLink,
      byPort: byPort,
      byVertex: function( vertexId ) {
         if( !linksByVertex[ vertexId ] ) {
            linksByVertex[ vertexId ] = {};
         }
         return linksByVertex[ vertexId ];
      },
      byEdge: function( edgeId ) {
         if( !linksByEdge[ edgeId ] ) {
            linksByEdge[ edgeId ] = {};
         }
         return linksByEdge[ edgeId ];
      },
      repaint: function() {
         ng.forEach( linkControllers, function( controller ) {
            controller.repaint();
         } );
      },
      registerController: function( linkId, linkController ) {
         linkControllers[ linkId ] = linkController;
      },
      controllers: controllers,
      controllersById: function() {
         return linkControllers;
      }
   };

}
