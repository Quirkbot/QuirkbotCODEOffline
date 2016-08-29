'use strict';

var path = require('path');
var fs = require('fs');
var gulp = require('gulp');
var file = require('gulp-file');
var jeditor = require('gulp-json-editor');
var del = require('del');
var config = require('./gulpconfig.json');

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
})
gulp.task('patch-code', function () {
	var template = function( opts ) {
		return "var USERNAME = '" + opts.nickname + "';var PASSWORD = '" + opts.password + "'";
	}
	return file('injected_scripts.js', template(config.credentials))
		.pipe(gulp.dest('dist_polymer', {overwrite: true}));
})
gulp.task('build', ['patch-extension', 'patch-code']);
gulp.task('compile', ['build'], function () {});
gulp.task('deploy', function () {});
