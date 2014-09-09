module.exports = function( grunt ) {

	// Project configuration.
	grunt.initConfig(
		{
			pkg : grunt.file.readJSON( "bower.json" ),

			jshint : {
				options : {
					jshintrc : true
				},
				src     : {
					src : [
						"src/*.js"
					]
				}
			},

			uglify : {
				js : {
					src  : "src/<%= pkg.name %>.js",
					dest : "dist/<%= pkg.name %>.min.js"
				}
			},

			watch : {
				files : [ "src/*.js" ],
				tasks : [ "jshint" ]
			}
		}
	);

	grunt.loadNpmTasks( "grunt-contrib-jshint" );
	grunt.loadNpmTasks( "grunt-contrib-uglify" );
	grunt.loadNpmTasks( "grunt-contrib-watch" );

	grunt.registerTask( "default", [ "jshint", "uglify" ] );
};
