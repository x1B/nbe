# NBE: Node Based Editing

Prototyping environment for a node-based-editing control based on web technologies

## The Model

The model is a directed (hyper-)graph consisting of vertices and typed edges.

- Each vertex may have an arbitrary number of labeled input and output ports
- Each port may be connected to 0..1 edges of matching type
- Each edge may be connected to any number of inputs or outputs (1:n, n:m or n:1 depending on the edge type)


## Current Status

#### All it does _right now:_

- models can be displayed
- vertices and edges can be moved around
- edges and links can be created and destroyed
- undo/redo of structural operations
- adding vertices by receiving data through API call and/or drag/drop
- automatic layout using the [https://github.com/cpettitt/dagre](dagre library)

#### Planned Features
- undo/redo of layout operations
- simpler presentation of 1:n or n:1 edges (no visible edge node, just port-to-port links)
- specs and spec-tests for the graph controller operations which are exposed as an API
- rendering in MSIE needs to be fixed (for >=11) for any type of release


## The Implementation

The implementation is based around a set of angular directives which collaborate to implement a node-based editor. Links between vertices and edges are rendered using SVG. There is a separate model which describes the graph layout.


## INSTALLATION

git clone https://github.com/x1B/nbe.git
npm install bower
./node_modules/.bin/bower install
