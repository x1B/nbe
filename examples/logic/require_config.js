require.config( {
   baseUrl: './',
   shim: {
      underscore: { exports: '_' },
      dagre: { exports: 'dagre' },
      angular: { exports: 'angular' }
   },
   packages: [
      {
         name: 'nbe',
         location: '../../js',
         main: 'nbe'
      }
   ],
   paths: {
      'text': '../../bower_components/requirejs-plugins/lib/text',
      'json': '../../bower_components/requirejs-plugins/src/json',
      'jquery': '../../bower_components/jquery/dist/jquery',
      'jquery_ui': '../../bower_components/jquery_ui/ui',
      'angular': '../../bower_components/angular/angular',
      'dagre': '../../bower_components/dagre/index'
   }
} );
