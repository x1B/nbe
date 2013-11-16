define([], function () {

   var data = {
      "dummyModel": {
         vertices: {
            "v0": {
               label: "A Resource Master",
               ports: {
                  "in": {
                     "i0": { label: "Enable On", type: "FLAG" },
                     "i1": { label: "My Trigger", type: "ACTION" }
                  },
                  "out": {
                     "o0": { label: "Resource (M)", type: "RESOURCE" },
                     "o1": { label: "Confirm", type: "ACTION" }
                  }
               }
            },
            "v1": {
               label: "Weird Stuff",
               ports: {
                  "in": {
                     "i0": { label: "Some Resource (S)", type: "RESOURCE" },
                     "i1": { label: "Another Resource (S)", type: "RESOURCE" },
                     "i2": { label: "Play Music On", type: "FLAG" }
                  },
                  "out": {
                     "o0": { label: "Other Resource (M)", type: "RESOURCE", edge: "e0" },
                     "o1": { label: "Cancel Action", type: "ACTION" }
                  }
               }
            },
            "v2": {
               label: "Silly Stuff",
               ports: {
                  "in": {
                     "i0": { label: "The Resource (S)", type: "RESOURCE", edge: "e0" },
                     "i1": { label: "Shuffle Action", type: "ACTION" }
                  },
                  "out": {
                     "o0": { label: "Another Resource (M)", type: "RESOURCE" },
                     "o1": { label: "Refresh Action", type: "ACTION" }
                  }
               }
            },
            "v3": {
               label: "A Big One",
               ports: {
                  "in": {
                     "i0": { label: "First Resource (S)", type: "RESOURCE", edge: "e0" },
                     "i1": { label: "Second Resource (S)", type: "RESOURCE" },
                     "i2": { label: "Take a Second", type: "FLAG" },
                     "i3": { label: "Save Action", type: "ACTION" }
                  },
                  "out": {
                     "o0": { label: "Third Resource (M)", type: "RESOURCE" },
                     "o1": { label: "Fourth Resource (M)", type: "RESOURCE" },
                     "o2": { label: "Use the Fourth", type: "FLAG" }
                  }
               }
            }
         },
         "edges": {
            "e0": {
               "label": "myRessource",
               "type": "RESOURCE"
            },
            "e1": {
               "label": "myAction",
               "type": "ACTION"
            },
            "e2": {
               "label": "myFlag",
               "type": "FLAG"
            }
         }
      },

      "dummyLayout": {
         "vertices": {
            "v0": { "left": "10%", "top": "10%" },
            "v1": { "left": "15%", "top": "60%" },
            "v2": { "left": "70%", "top": "20%" },
            "v3": { "left": "60%", "top": "50%" }
         },
         "edges": {
            "e0": { "left": "40%", "top": "30%" },
            "e1": { "left": "40%", "top": "60%" },
            "e2": { "left": "50%", "top": "70%" }
         }
      }
   };

   return {
      get: function ( key ) {
         return data[ key ];
      }
   }
});