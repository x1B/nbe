define( [
   'jquery',
   'angular',
   'dagre',
   'directives/graph',
   'directives/edge',
   'directives/vertex',
   'directives/link',
   'directives/port',
   'json!../data/dummy_model.json',
   'json!../data/dummy_layout.json'
],
function (
   $,
   ng,
   dagre,
   graphDirective,
   edgeDirective,
   vertexDirective,
   linkDirective,
   portDirective,
   dummyModel,
   dummyLayout ) {
   'use strict';

   var module = ng.module( 'GraphWidget', [ ] );

   //////////////////////////////////////////////////////////////////////////////////////////////////////////

   function GraphWidget( $scope ) {
      $scope.model = dummyModel;
      $scope.layout = dummyLayout;

      var g = new dagre.Digraph();
      g.addNode("kspacey",    { label: "Kevin Spacey",  width: 144, height: 100 });
      g.addNode("swilliams",  { label: "Saul Williams", width: 160, height: 100 });
      g.addNode("bpitt",      { label: "Brad Pitt",     width: 108, height: 100 });
      g.addNode("hford",      { label: "Harrison Ford", width: 168, height: 100 });
      g.addNode("lwilson",    { label: "Luke Wilson",   width: 144, height: 100 });
      g.addNode("kbacon",     { label: "Kevin Bacon",   width: 121, height: 100 });
      g.addEdge(null, "kspacey",   "swilliams");
      g.addEdge(null, "swilliams", "kbacon");
      g.addEdge(null, "bpitt",     "kbacon");
      g.addEdge(null, "hford",     "lwilson");
      g.addEdge(null, "lwilson",   "kbacon");
      console.log( g );
      var layout = dagre.layout().run(g);
      console.log( layout );
   }

   GraphWidget.$inject = [ '$scope' ];

   module.controller( 'GraphWidget', GraphWidget );

   //////////////////////////////////////////////////////////////////////////////////////////////////////////

   graphDirective.define( module );
   edgeDirective.define( module );
   vertexDirective.define( module );
   linkDirective.define( module );
   portDirective.define( module );

   //////////////////////////////////////////////////////////////////////////////////////////////////////////

   return module;

} );
