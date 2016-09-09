'use strict'

var utils = require('./utils.js')
var path = require('path')
var fs = require('fs')
var gulp = require('gulp')
var file = require('gulp-file')
var runSequence = require('run-sequence')
var jeditor = require('gulp-json-editor')
var config = require(path.resolve('src', 'config.json'))
var NWB = require('nwjs-builder')

/*
 * This task install src npm dependencies
 */
gulp.task('install-dependencies', function (cb) {
	utils.pass()
	.then(utils.execute('npm --prefix src install src --no-optional --production'))
	.then(function() {
		cb()
	})
	.catch(cb)
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
				if( matches.indexOf( '*://localhost/*' ) == -1 ) {
					matches.push('*://localhost/*')
				}
				return json
			})
		)
		.pipe(
			gulp.dest( path.resolve( 'src', 'extension' ) )
		)
})

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
		.pipe(gulp.dest(path.resolve('src', 'code')))
})

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
gulp.task('compose', function(cb) {
	runSequence(
		'pre-clean',
		'pre-clean',
		'install-dependencies',
		'move-files',
		['patch-extension', 'patch-code'],
		'post-clean',
		cb
	)
})

/*
 * This task builds the app as a platform specified executable program
 */
gulp.task('build', ['compose'], function (cb) {
	var pkg = require(path.resolve('src','package.json'))
	// Build the app
	new Promise(function(resolve, reject) {
		var check = function (error) {
			if(error){
				return reject(error)
			}
			resolve()
		}
		NWB.commands.nwbuild(
			'src',
			{
				outputDir: 'build',
				version: '0.17.0',
				outputName: `${pkg.name}-${pkg.version}-{target}`,
				executableName: pkg['executable-name'],
				sideBySide: true
			},
			check
		)
	})
	// Make the OSX modifications
	.then(function () {
		if(process.platform !== 'darwin') {
			return
		}
		console.log('Moving extension side by side with executable.')
		return utils.pass()
		.then(utils.copyDir(
			path.resolve(`build/${pkg.name}-${pkg.version}-osx-x64/${pkg['executable-name']}.app/Contents/Resources/app.nw/extension`),
			path.resolve(`build/${pkg.name}-${pkg.version}-osx-x64/${pkg['executable-name']}.app/Contents/MacOS/extension`)
		))
		.then(utils.deleteDir(
			path.resolve(`build/${pkg.name}-${pkg.version}-osx-x64/${pkg['executable-name']}.app/Contents/Resources/app.nw/extension`)
		))

	})
	.then(function() {
		cb()
	})
	.catch(cb)

})

/*
 * This task packages the windows app
 */
gulp.task('package-windows', function (cb) {
	var pkg = require(path.resolve('src','package.json'))

	// Create the NSIS file from the template
	var template = fs.readFileSync(path.resolve('assets-windows', 'installer.nsi.template')).toString()
	.split('{{APP_NAME}}').join(pkg['executable-name'])
	fs.writeFileSync(path.resolve('assets-windows', 'installer.nsi'), template)

	// Execute the NSIS builder
	utils.pass()
	.then(utils.execute('makensis.exe assets-windows\\installer.nsi'))
	.then(function() {
		cb()
	})
	.catch(cb)
})


/*
 * This task clean everything produced by the builds
 */
gulp.task('pre-clean', function (cb) {
	utils.pass()
	.then(utils.deleteDir(path.resolve('build')))
	.then(utils.deleteDir(path.resolve('src', 'node_modules')))
	.then(utils.deleteDir(path.resolve('src', 'code')))
	.then(utils.deleteDir(path.resolve('src', 'db')))
	.then(utils.deleteDir(path.resolve('src', 'extension')))
	.then(utils.deleteDir(path.resolve('src', 'etc')))
	.then(function() {
		cb()
	})
	.catch(cb)
})

/*
 * This task cleans the app so it doesn't contains unused big source files
 */
gulp.task('post-clean', function (cb) {
	utils.pass()
	.then(utils.execute('npm --prefix src uninstall quirkbot-code-static src'))
	.then(utils.execute('npm --prefix src uninstall quirkbot-chrome-app src'))
	.then(utils.deleteDir(path.resolve('src', 'etc')))
	.then(function() {
		cb()
	})
	.catch(cb)
})

module.exports = gulp
