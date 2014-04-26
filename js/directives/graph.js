define( [
   'underscore',
   'jquery',
   'angular',
   '../utilities/async'
],
function ( underscore, $, ng, async, undefined ) {
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
         var selection;

         /** Transient members, re-initialized when the model is replaced. */
         var links;
         var linksByEdge;
         var linksByVertex;
         var linkControllers;
         var generateLinkId;
         var generateEdgeId;

         var self = $scope.nbeGraph = this;

         /** Provide access to the jQuery handle to the graph canvas element */
         var jqGraph = this.jqGraph = $( $element[ 0 ] );

         initGraph( $scope );

         // Controller API:
         this.vertexLinkControllers = vertexLinkControllers;
         this.edgeLinkControllers = edgeLinkControllers;

         this.makeConnectOp = makeConnectOp;
         this.makeDisconnectOp = makeDisconnectOp;

         this.selectEdge = selectEdge;

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         var operations = this.operations = ( function() {

            var undoStack = [];
            var redoStack = [];

            return {
               perform: function( op ) {
                  if ( op === noOp ) {
                     return;
                  }
                  console.log( 'op: ', op );
                  $scope.$apply( op );
                  undoStack.push( op );
               },
               startTransaction: function() {
                  var transactionOps = [];
                  return {
                     perform: function( op ) {
                        // :TODO: manage transaction state
                        operations.perform( op );
                     },
                     commit: function() {
                        // :TODO: manage transaction state
                     },
                     rollBack: function() {
                        // :TODO: manage transaction state
                     }
                  }
               },
               undo: function() {
                  var op = undoStack.pop();
                  if ( op ) {
                     $scope.$apply( op.undo );
                     redoStack.push( op );
                  }
               },
               redo: function() {
                  var op = redoStack.pop();
                  if ( op ) {
                     $scope.$apply( op );
                     undoStack.push( op );
                  }
               }
            };

         } )();

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         function repaint() {
            $scope.canvas = {
               width: jqGraph.width(),
               height: jqGraph.height()
            };

            ng.forEach( linkControllers, function( controller ) {
               controller.repaint();
            } );
         }

         $( window ).on( 'resize', async.repeatAfter( underscore.debounce( repaint, 20 ), $timeout, 20 ) );

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         function initGraph( $scope ) {
            model = $scope.model;
            layout = $scope.layout;
            view = $scope.view;
            selection = $scope.selection = { kind: null, id: null };

            linksByEdge = { };
            linksByVertex = { };
            self.linkControllers = linkControllers = { };

            view.links = links = { };
            generateEdgeId = idGenerator( '#', model.edges );
            generateLinkId = idGenerator( 'lnk', links );

            ng.forEach( model.vertices, function( vertex, vertexId ) {
               vertex.ports.filter( function( _ ) { return !!_.edgeId; } ).forEach( function( port ) {
                  var edgeRef = { nodeId: port.edgeId, port: null };
                  var vertexRef = { nodeId: vertexId, port: port };
                  if ( port.direction === 'in' ) {
                     createLink( edgeRef, vertexRef );
                  }
                  else {
                     createLink( vertexRef, edgeRef );
                  }
               } );
            } );

            $( document ).on( 'keydown', handleKeys );
            repaint();
         }

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         function handleKeys( event ) {
            var KEY_CODE_DELETE = 46, KEY_CODE_Y = 89, KEY_CODE_Z = 90;

            if ( event.keyCode === KEY_CODE_DELETE ) {
               if ( $scope.selection.kind === 'EDGE' ) {
                  operations.perform( makeDeleteEdgeOp( $scope.selection.id ) );
               }
            }
            else if ( event.metaKey || event.ctrlKey ) {
               if ( event.keyCode === KEY_CODE_Z ) {
                  if ( event.shiftKey ) {
                     operations.redo();
                  }
                  else {
                     operations.undo();
                  }
               }
               else if ( event.keyCode === KEY_CODE_Y ) {
                  operations.redo();
               }
            }
         }

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         function noOp() { }
         noOp.undo = noOp;

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         function makeConnectOp( fromRef, toRef ) {
            Object.freeze( fromRef );
            Object.freeze( toRef );

            if( !toRef.port ) {
               return makeConnectPortToEdgeOp( fromRef, toRef.nodeId );
            }
            else if( !fromRef.port ) {
               return makeConnectPortToEdgeOp( toRef, fromRef.nodeId );
            }
            else {
               return makeConnectPortToPortOp( fromRef, toRef );
            }

            function makeConnectPortToEdgeOp( vertexRef, toEdgeId ) {
               if ( vertexRef.port.type !== model.edges[ toEdgeId ].type ) {
                  return noOp;
               }
               var edgeRef = { nodeId: toEdgeId };
               function connectPortToEdgeOp() {
                  vertexRef.port.edgeId = toEdgeId;
                  if ( vertexRef.port.direction === 'in' ) {
                     createLink( edgeRef, vertexRef );
                  }
                  else {
                     createLink( vertexRef, edgeRef );
                  }
               }
               connectPortToEdgeOp.undo = makeDisconnectOp( vertexRef );
               return connectPortToEdgeOp;
            }

            function makeConnectPortToPortOp( fromRef, toRef ) {
               if ( fromRef.port.type !== toRef.port.type ||
                    fromRef.port.direction === toRef.port.direction ) {
                  return noOp;
               }

               var disconnectFromOp = makeDisconnectOp( fromRef );
               var disconnectToOp = makeDisconnectOp( toRef );
               function connectPortToPortOp() {
                  disconnectFromOp();
                  disconnectToOp();
                  var edgeId = createEdge( fromRef, toRef );
                  fromRef.port.edgeId = edgeId;
                  toRef.port.edgeId = edgeId;
                  connectPortToPortOp.undo = function() {
                     makeDisconnectOp( fromRef, toRef )();
                     disconnectToOp.undo();
                     disconnectFromOp.undo();
                  }
               }
               return connectPortToPortOp;
            }
         }

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         function makeDisconnectOp( ref ) {
            Object.freeze( ref );

            function disconnectOp() {
               if ( !ref.port.edgeId ) {
                  disconnectOp.undo = noOp;
                  return;
               }
               var edgeId = ref.port.edgeId;
               var link = linkByPort( ref.nodeId, ref.port );

               destroyLink( link );
               delete ref.port.edgeId;
               var removedEdge;
               if ( !Object.keys( linksByEdge[ edgeId ] ).length ) {
                  removedEdge = model.edges[ edgeId ];
                  delete model.edges[ edgeId ];
               }

               disconnectOp.undo = function() {
                  if ( removedEdge ) {
                     model.edges[ edgeId ] = removedEdge;
                  }
                  var edgeRef = { nodeId: edgeId };
                  ref.port.edgeId = edgeId;
                  if ( ref.port.direction === 'in' ) {
                     createLink( edgeRef, ref );
                  }
                  else {
                     createLink( ref, edgeRef );
                  }
               };
            }

            return disconnectOp;
         }

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         function makeCompositionOp( /* args */ ) {
            var args = arguments;
            var n = arguments.length;
            function compositionOp() {
               for ( var i = 0; i < n; ++i ) {
                  args[ i ]();
               }
            }
            compositionOp.undo = function() {
               for ( var i = n - 1; i >= 0; --i ) {
                  args[ i ].undo();
               }
            };
            return compositionOp;
         }

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         function makeDeleteEdgeOp( edgeId ) {
            var steps = [];
            ng.forEach( model.vertices, function( vertex, vertexId ) {
               vertex.ports.forEach( function( port ) {
                  if( port.edgeId === edgeId ) {
                     steps.push( makeDisconnectOp( { nodeId: vertexId, port: port } ) );
                  }
               } );
            } );
            return makeCompositionOp.apply( this, steps );
         }

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         function createLink( fromRef, toRef ) {
            var link = {
               id: generateLinkId(),
               type: ( fromRef.port || toRef.port ).type,
               source: fromRef,
               dest: toRef
            };
            function add( fromRef, innerKey, value ) {
               var map = fromRef.port ? linksByVertex : linksByEdge;
               if ( map[ fromRef.nodeId ] === undefined ) {
                  map[ fromRef.nodeId ] = { };
               }
               map[ fromRef.nodeId ][ innerKey ] = value;
            }
            add( fromRef, link.id, link );
            add( toRef,   link.id, link );
            links[ link.id ] = link;
         }

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         function createEdge( fromRef, toRef ) {
            var id = generateEdgeId();
            var edgeRef = { nodeId: id };
            var type = fromRef.port.type;
            model.edges[ id ] = {
               type: type,
               label: type.toLowerCase() + ' ' + id
            };
            var fromLayout =  layout.vertices[ fromRef.nodeId ];
            var toLayout =  layout.vertices[ toRef.nodeId ];
            var centerX = ( parseFloat( fromLayout.left ) + parseFloat( toLayout.left ) ) / 2;
            var centerY = ( parseFloat( fromLayout.top ) + parseFloat( toLayout.top ) ) / 2;
            layout.edges[ id ] = { left: centerX, top: centerY };
            createLink( fromRef, edgeRef );
            createLink( edgeRef, toRef );
            return id;
         }

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         function destroyLink( link ) {
            function remove( map, nodeId, linkId ) {
               delete map[ nodeId ][ linkId ];
            }
            remove( link.source.port ? linksByVertex : linksByEdge, link.source.nodeId, link.id );
            remove( link.dest.port   ? linksByVertex : linksByEdge, link.dest.nodeId,   link.id );
            delete links[ link.id ];
         }

         /////////////////////////////////////////////////////////////////////////////////////////////////////

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
            var portId = port.id;
            var links = linksByVertex[ vertexId ];
            var keys = Object.keys( links );

            for ( var i = keys.length; i --> 0; ) {
               var linkId = keys[ i ];
               var link = links[ linkId ];
               if ( link.source.port && link.source.port.id === portId ) {
                  return link;
               }
               if ( link.dest.port && link.dest.port.id === portId ) {
                  return link;
               }
            }
            return null;
         }

         ////////////////////////////////////////////////////////////////////////////////////////////////////////

         function idGenerator( prefix, currentMap ) {
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

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         function clearSelection() {
            selection.id = null;
            selection.kind = null;
         }

         function selectEdge( edgeId ) {
            selection.id = edgeId;
            selection.kind = 'EDGE';
         }

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         self.dragDrop = ( function() {

            /** When port/link ghosts are dropped, the most recent drop target can be accessed here. */
            var dropRef;

            /** While a port is being dragged, it can be accessed here. */
            var dragRef;

            /** For undo/redo purposes, any operations of one drag/drop interaction are grouped into a transaction */
            var transaction;


            function clear() {
               jqGraph.removeClass( 'highlight-' + dragRef.port.type );
               jqGraph.removeClass( 'highlight-' + ( dragRef.port.direction === 'in' ? 'out' : 'in' ) );
               dropRef = dragRef = null;
            }

            return Object.freeze( {
               start: function( ref ) {
                  transaction = operations.startTransaction();
                  dragRef = { nodeId: ref.nodeId, port: ref.port };
                  jqGraph.addClass( 'highlight-' + ref.port.type );
                  jqGraph.addClass( 'highlight-' + ( ref.port.direction === 'in' ? 'out' : 'in' ) );
                  return transaction;
               },

               dropRef: function() {
                  return dropRef;
               },

               transaction: function() {
                  return transaction;
               },

               setDropRef: function( ref ) {
                  dropRef = ref;
               },

               finish: function() {
                  transaction.commit();
                  clear();
               },

               cancel: function() {
                  transaction.rollBack();
                  clear();
               }
            } );
         } )();

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