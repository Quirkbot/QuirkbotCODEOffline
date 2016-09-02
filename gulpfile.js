'use strict'

var path = require('path')
var fs = require('fs')
var gulp = require('gulp')
var file = require('gulp-file')
var rename = require('gulp-rename')
var jeditor = require('gulp-json-editor')
var del = require('del')
var config = require('./config.json')

/*
 * This task adds "*://localhost/*" to the extension allowed domains
 */
gulp.task('patch-extension', function () {
	return gulp.src(
			path.resolve( 'node_modules', 'quirkbot-chrome-app', 'manifest.json' )
		)
		.pipe(
			jeditor(function (json) {
				var matches = json.externally_connectable.matches
				if( matches.indexOf( "*://localhost/*" ) == -1 ) {
					matches.push("*://localhost/*")
				}
				return json
			})
		)
		.pipe(
			gulp.dest( path.resolve( 'node_modules', 'quirkbot-chrome-app' ) )
		)
});

/*
 * This task creates an injected_script.js file with relevant information
 * extracted from config.json
 */
gulp.task('patch-code', function () {
	var template = function( opts ) {
		return 'window.QUIRKBOT_CODE_DEFAULT_USER_NICKNAME = "' + opts.nickname + '"; \
						window.QUIRKBOT_CODE_DEFAULT_USER_PASSWORD = "' + opts.password + '";'
	}
	return file('injected_script.js', template(config.credentials))
		.pipe(gulp.dest('code'));
});

/*
 * This task moves CODE's polymer build from lite environment to the app root
 */
gulp.task('move-code', function () {
	return gulp.src(
		path.resolve('node_modules', 'quirkbot-code-static', 'dist', 'lite', 'dist_polymer', '**')
	)
	.pipe(gulp.dest(path.resolve('code')))
})

/*
 * This task moves extensions's build to the app root
 */
gulp.task('move-extension', function () {
	return gulp.src(
		path.resolve('node_modules', 'quirkbot-chrome-app', 'dist', '**')
	)
	.pipe(gulp.dest(path.resolve('extension')))
})

/*
 * This task moves all needed files around
 */
gulp.task('move-files', ['move-code', 'move-extension'])


/*
 * This task makes the app ready to execute
 */
gulp.task('build', ['patch-extension', 'patch-code', 'move-files']);

/*
 * This task packages the app as a platform specified executable program
 */
gulp.task('package', ['build'], function () {
	// Run nwjs packaging
});

/*
 * This task deploys the app to amazon
 */
gulp.task('deploy', function () {
	// Deploy to s3
});

gulp.task('test', function () {
	console.log( 'test 123' );
})

/*
 * This task cleans the app so it doesn't contains unused big source files
 */
gulp.task('clean', function () {
	return del( [
		'node_modules',
		'dist_polymer'
	])
})

module.exports = gulp;
