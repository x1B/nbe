# Changelog

## Last Changes

- [#41](https://github.com/x1B/nbe/issues/41): fixed layout of simple edges in selection


## v0.1.0

- [#40](https://github.com/x1B/nbe/issues/40): prepared codebase for release v0.1.0

- [#39](https://github.com/x1B/nbe/issues/39): fixed port dragging and double click

- [#38](https://github.com/x1B/nbe/issues/38): refactored the graph directive controller

- [#37](https://github.com/x1B/nbe/issues/37): implemented configurable zoom levels based on SCSS mixins

- [#36](https://github.com/x1B/nbe/issues/36): added 'simple' edge types for 1:n and n:1 relations

- [#33](https://github.com/x1B/nbe/issues/33): added informations to install app

- [#17](https://github.com/x1B/nbe/issues/17): added several (incomplete) examples, updated changelog

- [#32](https://github.com/x1B/nbe/issues/32): fixed dragging of diconnected nodes

- [#22](https://github.com/x1B/nbe/issues/22): updated code-style (no space before opening brace)

- [#29](https://github.com/x1B/nbe/issues/29): implemented multiple selection:
    * select multiple nodes by dragging a rectangle
    * delete the complete selection at once
    * auto-layout only applies to selected nodes (or all nodes)
    * dragging a selected node drags the entire selection

- [#28](https://github.com/x1B/nbe/issues/28): implemented circuit simulator demo

- [#26](https://github.com/x1B/nbe/issues/26): added a short ping animation which is triggered when a link is formed

- [#25](https://github.com/x1B/nbe/issues/25): fix link pathing during port drag/drop

- [#24](https://github.com/x1B/nbe/issues/24): disconnect ports using doubleclick instead of click

- [#23](https://github.com/x1B/nbe/issues/23): injected more things
    * extracted constant values into injectable settings
    * replaced async utility with async service
    * added async service

- [#12](https://github.com/x1B/nbe/issues/12): allowed to filter visible edges by type
    * ports of a hidden type are hidden as well
    * only visible edges are included in automatic layout

- [#11](https://github.com/x1B/nbe/issues/11): allowed to restrict edge cardinality by type and port direction (source ports, dest ports)

- [#21](https://github.com/x1B/nbe/issues/21): fixed direction-dependent highlighting of ports on drag

- [#20](https://github.com/x1B/nbe/issues/20): allowed graph inside scroll-container to grow, allowed multiple graphs on the same page, to be used by different AngularJS modules.

- [#18](https://github.com/x1B/nbe/issues/18): allowed to provide a button for automatic layout

- [#9](https://github.com/x1B/nbe/issues/9): fixed placement of edges upon creation

- [#16](https://github.com/x1B/nbe/issues/16): made it simpler to disconnect ports from edges: just click on the port

- [#3](https://github.com/x1B/nbe/issues/3): implemented automatic layout calculation using Dagre

- [#14](https://github.com/x1B/nbe/issues/14): fixed port dragging after refactoring

- [#8](https://github.com/x1B/nbe/issues/8): refactoring: moved operations (undo/redo) to a new module

- [#6](https://github.com/x1B/nbe/issues/6): moved graph HTML into the directives

- [#7](https://github.com/x1B/nbe/issues/7): cleaned up most dead code

- [#13](https://github.com/x1B/nbe/issues/13): fixed link direction when connecting input-port to output-port

- [#10](https://github.com/x1B/nbe/issues/10): remove embedded bootstrap code

- [#5](https://github.com/x1B/nbe/issues/5): allow to select vertices and remove them using DELETE key

- [#2](https://github.com/x1B/nbe/issues/2): added undo/redo handling

- [#4](https://github.com/x1B/nbe/issues/4): allow to remove selected edge using DELETE key

- [#1](https://github.com/x1B/nbe/issues/1): replaced embedded dependencies with bower
