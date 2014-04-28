require.config( {
   baseUrl: 'js',
   shim: {
      underscore: { exports: '_' },
      dagre: { exports: 'dagre' },
      angular: { exports: 'angular' }
   },
   paths: {
      "jquery": '../bower_components/jquery/dist/jquery',
      "jquery_ui": '../bower_components/jquery_ui',
      "underscore": '../bower_components/underscore/underscore',
      "angular": '../bower_components/angular/angular',
      "dagre": "../bower_components/dagre/index",
      "text": '../bower_components/requirejs-plugins/lib/text',
      "json": '../bower_components/requirejs-plugins/src/json'
   }
} );
