var require = {
   baseUrl: './bower_components/',
   shim: {
      dagre: { exports: 'dagre' },
      angular: { exports: 'angular' }
   },
   packages: [
      {
         name: 'nbe',
         location: 'nbe/js',
         main: 'nbe'
      },
      {
         name: 'nuke',
         location: '../lib/',
         main: 'NukeDemoController'
      }
   ],
   paths: {
      'angular': '../../../bower_components/angular/angular',
      'dagre': 'dagre/index',
      'jquery': 'jquery/dist/jquery',
      'jquery_ui': 'jquery_ui/ui',
      'json': 'requirejs-plugins/src/json',
      'text': 'requirejs-plugins/lib/text'
   }
};
