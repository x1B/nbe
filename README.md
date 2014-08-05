# NBE: Node Based Editing

A node-based-editing control based on web technologies

NBE is a _library_ to help develop node-based-diting applications using AngularJS.
It is implemented as a set of AngularJS _directives_ which collaborate to implement a node-based editor (nbe).
Links between vertices and edges are rendered using SVG.
Applications speak to the nbe by binding it to their graph model (see below) and potentially to their layout and edge type models.


## The Model

The model of NBE is a directed (hyper-)graph consisting of vertices and typed edges:

- Each vertex may have an arbitrary number of labeled input and output ports
- Each port may be connected to 0..1 edges of matching type
- Each edge may be connected to any number of inputs or outputs (1:n, n:m or n:1 depending on the edge type)


## Current Status

The project is still relatively immature, but already has a couple of nice features that might justify having a closer look.
New features and bugfixes are tracked in the CHANGELOG.md file.

#### What NBE can do
- models can be displayed
- vertices can be moved around
- edges (links between vertices) can be created and destroyed
- undo/redo of structural operations using the keyboard
- changes to the model (triggered by the host application) are observed by the editor
- automatic layout using the [https://github.com/cpettitt/dagre](dagre library)
- edges can be simple (1:n, n:1) or complex (_hyperedges_/n:m)
- hyper-edges have multiple incoming and outgoing links, and are represented by circles

#### Known Bugs
- rendering needs to be fixed for MSIE11+ (issue #14)
- SVG rendering in Safari seems to be broken, not sure what is the reason (issue #35)
- [https://github.com/x1B/nbe/issues?q=is%3Aopen+is%3Aissue+label%3Abug](more bugs)

#### Planned Features
- undo/redo of layout operations
- specs and spec-tests for the graph controller operations which are exposed as an API
- [https://github.com/x1B/nbe/issues?q=is%3Aopen+is%3Aissue+label%3Aenhancement](more planned features)


## Getting Started

#### Setup

Included with the project are several examples that show how to include `nbe` into a project using _bower_ and _RequireJS_.  
The examples also contain a _Gruntfile_ which to build an optimized version, which is completely optional. 
To get started, run the `logic` example app, which allows you to edit a logical circuit and to simulate its operation:

```sh
# get the sources
git clone https://github.com/x1B/nbe.git
# set up dependencies, shared by all examples
bower install
```

Serve the directory where you extracted nbe from any web server.
Navigate to `examples/logic/debug.html`, or to `examples/logic/index.html` for an optimized version.    
If you make changes, the optimized version can be rebuilt (requires `npm` and `grunt`):
```sh
cd examples/logic
npm install
```

#### The API

Here is a quick walk-through of the API based on the `logic` example application:

The graph model is a JavaScript object with `edges` and `vertices`.
As the example in the file `lib/data/dummy_model.json`, edges and vertices are stored under their respective IDs which occupy separate namespaces.
Edges have the string properties `type` and `label`, while vertices have a `label` as well as a list of `ports`.
Each port is an object with a `label`, an `id` (must be unique within the vertex), an optional `direction` ("in" by default), and an optional `edgeId` referencing the edge a port is connected to (if any). 

Application code interacts with the nbe using the AngularJS directive `nbeGraph`.
Have a look at the file `lib/logic_demo.html` for an example of an nbe embedding.
For styling, it is recommended to put the `nbeGraph` onto a DIV, and to put that DIV inside another block-level element with fixed dimensions and CSS class `graph-container`.
The directive takes an AngularJS binding expression that must evaluate to a graph-model as described above.

Use the attribute `data-nbe-graph-types` to configure the edge types of your application.
Each edge type gets its own color defined in the `css`.
It is strongly recommended to use `compass` to generate edge-type CSS for a given application as illustrated in the example under `scss/`.
The edge types are configured as an object, where each edge types has a name (the key) and three properties (the value, an object):
 * the property `simple` (boolean) determines if an edge is just a 1:n (or n:1) edge (`true`), or an n:m _hyperedge_ (`false`, default)
 * the property `maxSources` (number) puts a maximum on the number of incoming edges
 * the property `maxDestinations` (number) puts a maximum on the number of outgoing edges
