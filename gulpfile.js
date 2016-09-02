'use strict'

var path = require('path')
var fs = require('fs')
var gulp = require('gulp')
var file = require('gulp-file')
var runSequence = require('run-sequence');
var exec = require('child_process').exec
var jeditor = require('gulp-json-editor')
var del = require('del')
var config = require(path.resolve('src', 'config.json'))
var NwBuilder = require('nw-builder');

/*
 * This task install src npm dependencies
 */
gulp.task('install-dependencies', function (cb) {
	exec('npm --prefix src install src', cb )
})

/*
 * This task adds "*://localhost/*" to the extension allowed domains
 */
gulp.task('patch-extension', function () {
	return gulp.src(
			path.resolve( 'src', 'extension', 'manifest.json' )
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
			gulp.dest( path.resolve( 'src', 'extension' ) )
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
	return file('injected_script.js', template(config.credentials), {src:true})
		.pipe(gulp.dest(path.resolve('src', 'code')));
});

/*
 * This task moves CODE's polymer build from lite environment to the app root
 */
gulp.task('move-code', function () {
	return gulp.src(
		path.resolve('src', 'node_modules', 'quirkbot-code-static', 'dist', 'lite', 'dist_polymer', '**')
	)
	.pipe(gulp.dest(path.resolve('src', 'code')))
})

/*
 * This task moves extensions's build to the app root
 */
gulp.task('move-extension', function () {
	return gulp.src(
		path.resolve('src', 'node_modules', 'quirkbot-chrome-app', 'dist', '**')
	)
	.pipe(gulp.dest(path.resolve('src', 'extension')))
})

/*
 * This task moves all needed files around
 */
gulp.task('move-files', ['move-code', 'move-extension'])


/*
 * This task makes the app ready to execute
 */
gulp.task('build', function(cb) {
	runSequence(
		'install-dependencies',
		'move-files',
		['patch-extension', 'patch-code'],
		'clean',
		cb
	);
});

/*
 * This task packages the app as a platform specified executable program
 */
gulp.task('package', ['build'], function () {
	var nw = new NwBuilder({
	    files: path.resolve( './', 'src', '**' ), // use the glob format
	    platforms: [ 'osx64', 'win64', 'linux64'],
	    version: '0.16.1'
	});

	nw.on('log',  console.log);

	// Build returns a promise
	return nw.build().then(function () {
	   console.log('all done!');
	}).catch(function (error) {
	    console.error(error);
	});
});

/*
 * This task deploys the app to amazon
 */
gulp.task('deploy', function () {
	// Deploy to s3
});

/*
 * This task cleans the app so it doesn't contains unused big source files
 */
gulp.task('clean-code', function (cb) {
	exec('npm --prefix src uninstall quirkbot-code-static src', cb)
})
gulp.task('clean-extension', function (cb) {
	exec('npm --prefix src uninstall quirkbot-chrome-app src', cb)
})
gulp.task('clean-etc', function (cb) {
	return del([path.resolve('./', 'src', 'etc')])
})
gulp.task('clean', ['clean-code', 'clean-extension', 'clean-etc'])

module.exports = gulp;
