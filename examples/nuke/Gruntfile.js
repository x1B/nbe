/*jshint node: true*/
module.exports = function( grunt ) {
   'use strict';

   var autoprefixer = require( 'autoprefixer-core' );

   grunt.initConfig( {
      requirejs: {
         'nbe_examples_nuke': {
            options: {
               baseUrl: 'bower_components/',
               mainConfigFile: 'require_config.js',
               include: [ 'requirejs/require' ],
               name: '../init',
               insertRequire: [ '../init' ],
               out: 'dist/init.js',
               optimize: 'uglify2',
               stubmodules: [ 'text', 'json' ],
               preserveLicenseComments: false
            }
         }
      },
      compass: {
         'nbe_examples_nuke': {
            options: {
            }
         }
      },
      postcss: {
         options: {
            processors: [
               autoprefixer( { browsers: [ 'last 2 version' ] } ).postcss
            ]
         },
         dist: { src: 'css/*.css' }
      }
   } );

   grunt.loadNpmTasks( 'grunt-postcss' );
   grunt.loadNpmTasks( 'grunt-contrib-compass' );
   grunt.loadNpmTasks( 'grunt-contrib-requirejs' );

   grunt.registerTask( 'build', ['requirejs', 'compass', 'postcss'] );
   grunt.registerTask( 'default', ['build'] );
};
