/* global global */
'use strict';

var path = require('path');
var fileSystem = require('fs');

global.PROJECT_ROOT_PATH = path.resolve('.');

module.exports = function(grunt) {

   var jsFiles = ['Gruntfile.js', 'services/**/src/**/*.js', 'services/**/test/**/*.js'];
   
   grunt.initConfig({
      jshint: {
         allButNotSettings : {
            options: {
               jshintrc: '.jshintrc'
            },
            src: jsFiles
         }
      },

      mochaTest: {
			libRaw: {
			  options: {
				 require: ['testGlobals.js'],
				 reporter: 'spec'
			  },
			  src: ['services/**/test/**/*.js']
			}
      },
      
            
      clean: [],
   });

   grunt.loadNpmTasks('grunt-contrib-jshint');
   grunt.loadNpmTasks('grunt-mocha-test');
   grunt.loadNpmTasks('grunt-contrib-clean');
	
   grunt.registerTask('lint', ['jshint']);
   grunt.registerTask('test', ['mochaTest:libRaw']);
   
   grunt.registerTask('default', ['lint', 'test']);
 };
