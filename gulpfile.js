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

var ASSETS_DIR = `assets-${process.platform}`
var BUILD_DIR = 'b'
var SRC_DIR = 'src'


/*
 * This task install src npm dependencies
 */
gulp.task('install-dependencies', function (cb) {
	utils.pass()
	.then(utils.execute('npm cache clean'))
	.then(utils.execute(`npm --no-optional --production --prefix ${SRC_DIR} install ${SRC_DIR}`))
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
			path.resolve( SRC_DIR, 'extension', 'manifest.json' )
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
			gulp.dest( path.resolve( SRC_DIR, 'extension' ) )
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
		.pipe(gulp.dest(path.resolve(SRC_DIR, 'code')))
})

/*
 * This task moves CODE's polymer build from lite environment to the app root
 */
gulp.task('move-code', function () {
	return gulp.src(
		path.resolve(SRC_DIR, 'node_modules', 'quirkbot-code-static', 'dist', 'lite', 'dist_polymer', '**')
	)
	.pipe(gulp.dest(path.resolve(SRC_DIR, 'code')))
})

/*
 * This task moves extensions's build to the app root
 */
gulp.task('move-extension', function () {
	return gulp.src(
		path.resolve(SRC_DIR, 'node_modules', 'quirkbot-chrome-app', 'dist', '**')
	)
	.pipe(gulp.dest(path.resolve(SRC_DIR, 'extension')))
})

/*
 * This task moves the platform specific updated
 */
gulp.task('move-updater', function (cb) {
	utils.pass()
	.then(utils.copyDir(
		path.resolve(ASSETS_DIR, /^win/.test(process.platform) ? 'updater.exe' : 'updater' ),
		path.resolve(SRC_DIR, /^win/.test(process.platform) ? 'updater.exe' : 'updater' )
	))
	.then(cb)
	.catch(cb)
})

/*
 * This task moves all needed files around
 */
gulp.task('move-files', ['move-code', 'move-extension', 'move-updater'])

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

	var pkg = require(path.resolve(SRC_DIR,'package.json'))
	// Build the app
	new Promise(function(resolve, reject) {
		var check = function (error) {
			if(error){
				return reject(error)
			}
			resolve()
		}
		NWB.commands.nwbuild(
			SRC_DIR,
			{
				outputDir: BUILD_DIR,
				version: '0.17.4',
				outputName: 'a',
				executableName: pkg['executable-name'],
				sideBySide: true,
				winIco: path.resolve(ASSETS_DIR, 'icon.ico'),
				macIcns: path.resolve(ASSETS_DIR, 'icon.icns')
			},
			check
		)
	})
	.then(cb)
	.catch(cb)

})

/*
 * This task packages the windows app
 */
gulp.task('package-win32', function (cb) {
	var pkg = require(path.resolve(SRC_DIR,'package.json'))

	// Create the NSIS file from the template
	var template = fs.readFileSync(path.resolve(ASSETS_DIR, 'installer.nsi.template')).toString()
	.split('{{APP_NAME}}').join(pkg['executable-name'])
	fs.writeFileSync(path.resolve(ASSETS_DIR, 'installer.nsi'), template)

	// Execute the NSIS builder
	utils.pass()
	.then(utils.execute(`makensis.exe /V4 ${ASSETS_DIR}\\installer.nsi`))
	// Create the out directory
	.then(utils.mkdir(
		path.resolve(BUILD_DIR, 'latest')
	))
	.then(utils.mkdir(
		path.resolve(BUILD_DIR, 'latest', process.platform)
	))
	.then(utils.mkdir(
		path.resolve(BUILD_DIR, 'latest', process.platform, pkg.version)
	))
	// Move the installer
	.then(utils.moveFile(
		path.resolve(BUILD_DIR, 'Quirkbot Installer.exe'),
		path.resolve(BUILD_DIR, 'latest', process.platform, pkg.version, 'Quirkbot Installer.exe')
	))
	// Zip the source
	.then(utils.zipDir(
		path.resolve(BUILD_DIR, 'a'),
		path.resolve(BUILD_DIR, 'latest', process.platform, pkg.version, 'src.zip'),
		pkg.versiongit
	))
	.then(cb)
	.catch(cb)
})

/*
 * This task packages the mac application
 */
gulp.task('package-darwin', function (cb) {
	var pkg = require(path.resolve(SRC_DIR,'package.json'))
	utils.pass()
	.then(utils.mkdir(
		path.resolve(BUILD_DIR, 'latest')
	))
	.then(utils.mkdir(
		path.resolve(BUILD_DIR, 'latest', process.platform)
	))
	.then(utils.mkdir(
		path.resolve(BUILD_DIR, 'latest', process.platform, pkg.version)
	))
	.then(utils.zipDir(
		path.resolve(BUILD_DIR, 'a', `${pkg['executable-name']}.app`),
		path.resolve(BUILD_DIR, 'latest', process.platform, pkg.version, 'src.zip'),
		`${pkg['executable-name']}.app`
	))
	.then(function() {
		return new Promise((resolve, reject) =>{
			var appdmg = require('appdmg')
			var dmg = appdmg({
				source: `${ASSETS_DIR}/dmg.json`,
				target: path.resolve(BUILD_DIR, 'latest', process.platform, pkg.version, `${pkg['executable-name']} Installer.dmg` )
			})

			dmg.on('finish', resolve)
			dmg.on('error', reject)
		})
	})
	.then(cb)
	.catch(function(error){
		console.log(error)
		cb(error)
	})

})

/*
 * This task packages the app, in the current platform
 */
gulp.task('package', function(cb) {
	runSequence(
		'build',
		`package-${process.platform}`,
		cb
	)

})

/*
 * This task clean everything produced by the builds
 */
gulp.task('pre-clean', function (cb) {
	utils.pass()
	.then(utils.deleteDir(path.resolve(BUILD_DIR)))
	.then(utils.deleteDir(path.resolve(SRC_DIR, 'node_modules')))
	.then(utils.deleteDir(path.resolve(SRC_DIR, 'code')))
	.then(utils.deleteDir(path.resolve(SRC_DIR, 'db')))
	.then(utils.deleteDir(path.resolve(SRC_DIR, 'extension')))
	.then(utils.deleteDir(path.resolve(SRC_DIR, /^win/.test(process.platform) ? 'updater.exe' : 'updater')))
	.then(utils.deleteDir(path.resolve(SRC_DIR, 'etc')))
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
	.then(utils.execute(`npm --prefix ${SRC_DIR} uninstall quirkbot-code-static`))
	.then(utils.execute(`npm --prefix ${SRC_DIR} uninstall quirkbot-chrome-app`))
	.then(utils.execute(
		`npm --prefix ${path.resolve(SRC_DIR, 'node_modules', 'quirkbot-compiler')} uninstall newrelic mongoose es6-promise`
	))
	.then(utils.execute(
		`npm --prefix ${path.resolve(SRC_DIR, 'node_modules', 'quirkbot-compiler', 'node_modules', 'npm-arduino-avr-gcc')} uninstall node-pre-gyp`
	))
	.then(utils.execute(
		`npm --prefix ${path.resolve(SRC_DIR, 'node_modules', 'quirkbot-compiler', 'node_modules', 'npm-arduino-builder')} uninstall node-pre-gyp`
	))
	.then(utils.execute(
		`npm --prefix ${path.resolve(SRC_DIR, 'node_modules', 'quirkbot-data-api')} uninstall `
		+ 'newrelic '
		+ 'loggly '
		+ 'winston-loggly '
		+ 'winston '
		+ 'sails-mongo '
		+ 'sails-generate '
		+ 'node-mandrill '
		+ 'grunt '
		+ 'grunt-cli '
		+ 'grunt-sync '
		+ 'grunt-sails-linker '
		+ 'grunt-contrib-clean '
		+ 'grunt-contrib-coffee '
		+ 'grunt-contrib-concat '
		+ 'grunt-contrib-copy '
		+ 'grunt-contrib-cssmin '
		+ 'grunt-contrib-jst '
		+ 'grunt-contrib-less '
		+ 'grunt-contrib-uglify '
		+ 'grunt-contrib-watch '
		+ 'express-handlebars '
	))
	.then(utils.deleteDir(path.resolve(SRC_DIR, 'etc')))
	.then(function () {
		var remove = require('find-remove')
		var results = remove(path.resolve(SRC_DIR,'node_modules'), {
			extensions: [
				'.md',
				'.MD',
				'.markdown',
				'.log',
				'.bak',
				'.min.js'
			],
			files: [
				//'package.json',
				'npm-shrinkwrap.json',
				'README',
				'Procfile',
				'Makefile',
				'LICENSE',
				'LICENSE.txt',
				'LICENCE',
				'License',
				'license',
				'CHANGELOG',
				'.gitignore',
				'.npmignore',
				'.editorconfig',
				'.travis.yml',
				'.jshintrc',
				'.idea',
				'.DS_Store'

			],
			dir: [
				'test',
				'tests',
				'example',
				'examples',
				'Bootloader',
				'jsdoc-toolkit'

			],
			'ignore':[
				'npm-arduino-avr-gcc'
			]
		})
		console.log(`Removed ${Object.keys(results).length} files.`)
	})
	.then(function() {
		cb()
	})
	.catch(error => {
		console.log(error)
		cb(error)
	})
})

module.exports = gulp
