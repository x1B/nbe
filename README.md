# NBE: Node-Based Editing

A node-based-editing control based on web technologies

NBE is a library to help develop node-based-editing applications using AngularJS.
It is implemented as a set of AngularJS _directives_ which collaborate to implement a node-based editor.
Links between vertices and edges are rendered using SVG, so only fairly recent browsers are supported:
Chrome and Firefox, Safari 7.1+ and MSIE 11+ should work decently well.
Applications speak to NBE by binding its graph model (see below) and potentially a layout and edge-type model (see below).


## The Model

The model of NBE is a directed (hyper-)graph consisting of vertices and typed edges:

- Each vertex may have an arbitrary number of labeled and typed input and output ports.
- Each port may be connected to 0..1 edges of matching type.
- Each edge may be connected to any number of inputs or outputs (1:n, n:m or n:1 depending on the edge type).


## Current Status

The project is still relatively immature, but already has a couple of nice features that might justify having a closer look.
New features and bugfixes are tracked in the [CHANGELOG](CHANGELOG.md).

#### What NBE offers
- display and manipulate directed (hyper-)graph models
- undo/redo structural operations using the keyboard
- select and cut/copy/paste graph parts
- changes to the model (triggered by the host application) are observed by the editor
- automatic layout using the [dagre library](https://github.com/cpettitt/dagre)
- edges for a given type are either simple edges (1:n, n:1) or complex _hyperedges_ (n:m)
- vertex types, to destinguish between different classes of vertices
- hyperedges have multiple incoming and outgoing links, and are represented by circles
- zoom in and out
- customize the appearance of the editor using (S)CSS

#### Planned Features
- undo/redo of layout operations
- specs and spec-tests for the graph controller operations which are exposed as an API
- [more planned features](https://github.com/x1B/nbe/issues?q=is%3Aopen+is%3Aissue+label%3Aenhancement)

#### Known Bugs
_no bugs on record at time of release_
- [more bugs](https://github.com/x1B/nbe/issues?q=is%3Aopen+is%3Aissue+label%3Abug)


## Getting Started

Included are several examples showing how to integrate NBE into projects which are using _[Bower](http://bower.io/)_ and _[RequireJS](http://requirejs.org/)_.  

### Setup

The examples also contain a _Gruntfile_ to build an optimized version, which is completely optional. 
To get started, run the `logic` example app, which allows you to edit a logical circuit and to simulate its operation:

```sh
# get the sources
git clone https://github.com/x1B/nbe.git
# set up dependencies, shared by all examples
bower install
```

Serve the directory where you extracted nbe from any web server.
Navigate to `examples/logic/debug.html` (using Mozilla Firefox or Google Chrome for now) to launch the demo application.
Or browse to `examples/logic/index.html` for the optimized version.    
If you make changes, the optimized version can be rebuilt (requires `npm` and `grunt`):
```sh
cd examples/logic
npm install
```

### Using the Node-Based Editor

Try adding logic signals and gates to the demo circuit, and connect them by dragging wires between the nodes.
Hit _'Flatten Main Circuit'_ to expand circuit compositions within the graph into a flattened model.
Use _'Run Simulation'_ to view state changes of the probed wires as the discrete clock drives the simulation.
The boxes represent vertices in the hypergraph, and the curved lines (_link_) make up the edges.
Hit _'Auto Layout'_ to tidy up the graph.
In this example, each _wire_ edge may have one source and multiple outgoing links (1:n), while log _channels_ are n:m hyperedges, which may (for the sake of demonstration) have multiple sinks.

You can double click on a connected _port_ (the socket where links connect to the vertices), to sever its link(s).
Also, you can select one or more nodes by clicking or by dragging a box to move or auto-layout them as a group, or hit _del_ to remove them.
Basic undo/redo functionality is provided by the usual shortcuts.

### The API

Here is a quick walk-through of the API based on the `logic` example application:

#### The Graph

The graph model is a JavaScript object containing two maps, `edges` and `vertices`.
As the example shows (entry `main` in file `lib/data/dummy_model.json`), edges and vertices are stored under their respective IDs, occupying separate namespaces.
Edges have the string properties `type` and `label`, while vertices have a `label` as well as two lists of _ports_ (`in` and `out`).
Each port is an object with a `label`, an `id` (unique within the vertex), an optional `direction` which is either `"out"` or `"in`" (default), and an optional `edgeId` referencing the edge a port is connected to (if any). 

Applications instantiate a node-based editor using the AngularJS directive `nbeGraph`, which should be referenced as `data-nbe-graph`.
Have a look at the file `lib/logic_demo.html` for an example of an NBE embedding.
For styling to work, it is recommended to put the `nbeGraph` onto a DIV, and to put that DIV inside another block-level element with fixed dimensions and CSS class `graph-container`.
The directive takes an AngularJS binding expression that must evaluate to a graph-model as described above.

#### Edge Types

Use the binding attribute `data-nbe-graph-types` on the graph element to configure the edge types of your application.
Each edge type gets its own color, to be defined in the CSS files.
It is strongly recommended to use `compass` to generate edge-type CSS for a given application as illustrated in the example under `scss/`.
The edge types are configured as an object: 
Each edge types has a name (the key) and up to three properties as the value object:
 * the property `simple` (boolean) determines if an edge is just a 1:n (or n:1) edge (`true`), or an n:m _hyperedge_ (`false`, default)
 * the property `maxSources` (number) puts a maximum on the number of incoming links for each edge
 * the property `maxDestinations` (number) puts a maximum on the number of outgoing links for each edge

#### The Layout

Applications may access and modify the graph layout, for example to persist it to local storage or onto a server.
It must be bound to the `data-nbe-graph-layout` attribute on the graph element.
The layout model looks similar to the data model, but contains `left` and `top` pixel coordinates for each node.
Have a look at the file `lib/data/dummy_layout.json` and you will get the idea.

#### Binding to the graph controller API

Any UI that is not directly associated with individual graph elements (nodes, edges, links) must be implemented by the application.
The logic demo has several buttons that are bound to the provided controller actions:
 * `calculateLayout()` invokes the Dagre layout algorithm on the selected nodes (or all nodes if the selection is empty)
 * `zoom.zoomIn()` and `zoom.zoomOut()` change the scale of the graph which is useful for large graphs


## Feedback

Please let [the original author](http://x1b.github.com) know if you have built something using NBE, or if you encounter any problems or questions.
