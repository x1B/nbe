/*jshint node: true*/
module.exports = function( grunt ) {
   'use strict';

   var pkg = grunt.file.readJSON( 'package.json' );

   var autoprefixer = require( 'autoprefixer-core' );

   grunt.initConfig( {
      requirejs: {
         'nbe_examples_logic': {
            options: {
               baseUrl: 'bower_components/',
               mainConfigFile: 'require_config.js',
               name: '../' + pkg.name,
               out: 'dist/' + pkg.name + '.js',
               include: [ 'requirejs/require' ],
               insertRequire: [ '../nbe_examples_logic' ],
               optimize: 'uglify2',
               preserveLicenseComments: false
            }
         }
      },
      compass: {
         'nbe_examples_logic': {
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
