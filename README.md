# NBE: Node Based Editing

Prototyping environment for a node-based-editing control based on web technologies

## The Model

The model is a directed (hyper-)graph consisting of vertices and typed edges.

- Each vertex may have an arbitrary number of labeled input and output ports
- Each port may be connected to 0..1 edges of matching type
- Each edge may be connected to any number of inputs or outputs (in the future, this may be dependent on the edge type)


## Current Status

#### All it does _right now:_

- models can be displayed
- vertices and edges can be moved around
- edges and links can be created and destroyed

#### Planned Features
- undo/redo of structural operations
- adding vertices by receiving data through API call and/or drag/drop
- embed the HTML into the graph directive so that it may be used outside of the prototype (eventually there should be a [LaxarJS](http://laxarjs.org) UI-control).
- specs and spec-tests for the graph controller operations which are exposed as an API
- rendering in Firefox and MSIE>=11 needs to be fixed for any type of release
- automatic layout using existing layout algorithms


## The Implementation

The implementation is based around a set of angular directives which collaborate to implement a node-based editor. Links between vertices and edges are rendered using SVG. There is a separate model which describes the graph layout
