require.config( {
   baseUrl: 'js',
   shim: {
      underscore: { exports: '_' },
      angular: { exports: 'angular' }
   },
   paths: {
      "jquery": '../bower_components/jquery/dist/jquery',
      "jquery_ui": '../bower_components/jquery_ui',
      "underscore": '../bower_components/underscore/underscore',
      "angular": '../bower_components/angular/angular',
      "text": '../bower_components/requirejs-plugins/lib/text',
      "json": '../bower_components/requirejs-plugins/src/json'
   }
} );
