var require = {
   baseUrl: './bower_components/',
   shim: {
      dagre: { exports: 'dagre' },
      angular: { exports: 'angular' }
   },
   packages: [
      {
         name: 'nbe',
         location: '../../../../nbe/js',
         main: 'nbe'
      },
      {
         name: 'nuke',
         location: '../lib/',
         main: 'NukeDemoController'
      }
   ],
   paths: {
      'text': 'requirejs-plugins/lib/text',
      'json': 'requirejs-plugins/src/json',
      'jquery': 'jquery/dist/jquery',
      'jquery_ui': 'jquery_ui/ui',
      'angular': 'angular/angular',
      'dagre': 'dagre/index'
   }
};
