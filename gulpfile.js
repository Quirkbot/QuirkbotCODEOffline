'use strict'

var path = require('path')
var fs = require('fs')
var gulp = require('gulp')
var file = require('gulp-file')
var jeditor = require('gulp-json-editor')
var del = require('del')
var config = require('./config.json')

gulp.task('patch-extension', function () {
	return gulp.src("node_modules/quirkbot-chrome-app/manifest.json")
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
			gulp.dest(
				"node_modules/quirkbot-chrome-app"),
				{ overwrite: true }
			)
});

gulp.task('patch-code', function () {
	var template = function( opts ) {
		return 'window.QUIRKBOT_CODE_DEFAULT_USER_NICKNAME = "' + opts.nickname + '"; \
						window.QUIRKBOT_CODE_DEFAULT_USER_PASSWORD = "' + opts.password + '";'
	}
	return file('injected_script.js', template(config.credentials))
		.pipe(gulp.dest('dist_polymer', {overwrite: true}));
});

gulp.task('build', ['patch-extension', 'patch-code']);

gulp.task('package', ['build'], function () {
	// Run nwjs packaging
});

gulp.task('deploy', function () {
	// Deploy to s3
});

gulp.task('clean', function () {
	return del( [
		'node_modules',
		'dist_polymer'
	])
})
