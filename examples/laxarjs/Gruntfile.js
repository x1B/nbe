/*jshint node: true*/
module.exports = function( grunt ) {
   'use strict';

   var pkg = grunt.file.readJSON( 'package.json' );
   var src = {
      gruntfile: 'Gruntfile.js',
      require: 'require_config.js',
      'nbe_examples_laxarjs': [
         'nbe_examples_laxarjs.js',
         'lib/**/*.js',
         'lib/data/*.json'
      ]
   };

   grunt.initConfig( {
      requirejs: {
         'nbe_examples_laxarjs': {
            options: {
               baseUrl: './',
               mainConfigFile: src.require,
               optimize: 'uglify2',
               preserveLicenseComments: false,
               generateSourceMaps: false,
               include: [ 'bower_components/requirejs/require.js' ],
               exclude: [ '' ],
               name: pkg.name,
               out: 'dist/' + pkg.name + '.js'
            }
         }
      }
   } );

   grunt.loadNpmTasks( 'grunt-contrib-requirejs' );

   grunt.registerTask( 'build', [ 'requirejs' ] );
   grunt.registerTask( 'default', [ 'build' ] );
};
