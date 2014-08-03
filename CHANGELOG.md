# Changelog

## Last Changes
- [#39](https://github.com/x1B/nbe/issues/39): Fixed port dragging and double click.
- [#38](https://github.com/x1B/nbe/issues/38): Refactored the graph directive controller.
- [#37](https://github.com/x1B/nbe/issues/37): Implemented configurable zoom levels based on SCSS mixins.
- [#36](https://github.com/x1B/nbe/issues/36): Added 'simple' edge types for 1:n and n:1 relations.
- [#33](https://github.com/x1B/nbe/issues/33): Added informations to install app
- [#17](https://github.com/x1B/nbe/issues/17): Added several (incomplete) examples. Updated changelog.
- [#32](https://github.com/x1B/nbe/issues/32): Fixed dragging of diconnected nodes.
- [#22](https://github.com/x1B/nbe/issues/22): Updated code-style (no space before opening brace).
- [#29](https://github.com/x1B/nbe/issues/29): Implemented multiple selection.
  * Select multiple nodes by dragging a rectangle.
  * Delete the complete selection at once.
  * Auto-Layout only applies to selected nodes (or all nodes).
  * Dragging a selected node drags the entire selection.
- [#28](https://github.com/x1B/nbe/issues/28): Implemented circuit simulator demo.
- [#26](https://github.com/x1B/nbe/issues/26): Added a short ping animation which is triggered when a link is formed.
- [#25](https://github.com/x1B/nbe/issues/25): Fix link pathing during port drag/drop.
- [#24](https://github.com/x1B/nbe/issues/24): Disconnect ports using doubleclick instead of click.
- [#23](https://github.com/x1B/nbe/issues/23): Injected more things.
  * Extracted constant values into injectable settings.
  * Replaced async utility with async service.
  * Added async service.
- [#12](https://github.com/x1B/nbe/issues/12): Allowed to filter visible edges by type.
  * Ports of a hidden type are hidden as well.
  * Only visible edges are included in automatic layout.
- [#11](https://github.com/x1B/nbe/issues/11): Allowed to restrict edge cardinality by type and port direction (source ports, dest ports).
- [#21](https://github.com/x1B/nbe/issues/21):
  Fixed direction-dependent highlighting of ports on drag.
  Also added missing changelog entry for #20.
- [#20](https://github.com/x1B/nbe/issues/20):
  Allowed graph inside scroll-container to grow as needed.
  Allowed multiple graphs on the same page, to be used by different AngularJS modules.
- [#18](https://github.com/x1B/nbe/issues/18): Allowed to provide a button for automatic layout.
- [#9](https://github.com/x1B/nbe/issues/9): Fixed placement of edges upon creation.
- [#16](https://github.com/x1B/nbe/issues/16): Made it simpler to disconnect ports from edges: just click on the port.
- [#3](https://github.com/x1B/nbe/issues/3): Implemented automatic layout calculation using Dagre.
- [#14](https://github.com/x1B/nbe/issues/14): Fixed port dragging after refactoring.
- [#8](https://github.com/x1B/nbe/issues/8): Refactoring: Moved operations (undo/redo) to a new module.
- [#6](https://github.com/x1B/nbe/issues/6): Moved graph HTML into the directives.
- [#7](https://github.com/x1B/nbe/issues/7): Cleaned up most dead code.
- [#13](https://github.com/x1B/nbe/issues/13): Fixed link direction when connecting input-port to output-port.
- [#10](https://github.com/x1B/nbe/issues/10): Remove embedded bootstrap code.
- [#5](https://github.com/x1B/nbe/issues/5): Allow to select vertices and remove them using DELETE key.
- [#2](https://github.com/x1B/nbe/issues/2): Added undo/redo handling.
- [#4](https://github.com/x1B/nbe/issues/4): Allow to remove selected edge using DELETE key.
- [#1](https://github.com/x1B/nbe/issues/1): Replaced embedded dependencies with bower.
