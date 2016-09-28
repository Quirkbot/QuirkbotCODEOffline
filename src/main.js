exports.init = function() {
	var path = require('path')
	var http = require('http')
	var url = require('url')
	var fs = require('fs')
	var utils = require('./utils.js')

	// Load configuration file
	var config = require( path.resolve('./', 'config.json') )
	var pkg = require( path.resolve('./', 'package.json') )

	// Create database folder if needed
	var dbPath = path.resolve( window.nw.App.dataPath, 'qbdb' ) + path.sep

	if( !fs.existsSync( dbPath ) ) {
		console.log('creating databases directory')
		console.log( dbPath )
		fs.mkdirSync( dbPath )
	} else {
		console.log('found database folder', dbPath )
		console.log( dbPath )
	}

	// Prepare the environment variables
	process.env.NODE_ENV = 'lite'
	process.env.API_DISK_DB_PATH = dbPath
	process.env.API_PORT = config.ports.api
	process.env.COMPILER_DISK_DB_PATH = dbPath
	process.env.COMPILER_BUILD_ROOT = window.nw.App.dataPath
	process.env.COMPILER_PORT = config.ports.compiler
	process.env.LITE_NICKNAME = config.credentials.nickname
	process.env.LITE_PASSWORD = config.credentials.password
	process.env.LITE_EMAIL = config.credentials.email
	process.env.WEB_CONCURRENCY = 1

	// Iniitialize CODE
	http.createServer(function (request, response) {
		let filePath = url.parse(request.url).pathname
		let ext = path.extname(filePath)
		if(!ext){
			filePath += (filePath.slice(-1) != '/') ? '/index.html' : 'index.html'
		}
		let typeMap = {
			'.html': 'text/html',
			'.css': 'text/css',
			'.json': 'application/json',
			'.png': 'image/png',
			'.jpg': 'image/jpg',
			'.gif': 'image/gif',
			'.svg': 'image/svg+xml',
			'.woff': 'font/woff',
			'.woff2': 'font/woff2'
		}
		let contentType = typeMap[ext]
		if(contentType){
			response.setHeader('Content-Type', contentType)
		}
		response.setHeader('Access-Control-Allow-Origin', '*')

		fs.readFile(`./code/${filePath}`, (error, content) => {
			response.writeHead(error ? 500 : 200)
			response.end(content, 'utf-8')
		})

	}).listen(config.ports.code)

	// Iniitialize API
	utils.forkProcess( path.resolve( utils.modulePath('quirkbot-data-api'), 'app.js') )

	// Initialized COMPILER
	utils.forkProcess( path.resolve( utils.modulePath('quirkbot-compiler'), 'server.js') )
	utils.forkProcess( path.resolve( utils.modulePath('quirkbot-compiler'), 'compiler.js') )

	// Load the extension
	fetch('/extension/manifest.json')
	.then(response => response.json())
	.then(manifest => manifest.app.background.scripts)
	.then(scripts => {
		let firstScripts = scripts.slice(0)
		firstScripts.pop()
		let promises = firstScripts.map(src => utils.loadScriptToDom(`/extension/${src}`))

		return Promise.all(promises)
		.then(() => scripts)
	})
	.then(scripts => utils.loadScriptToDom(`/extension/${scripts.pop()}`))

	// Deal with auto updates...
	var UPDATES_MANIFEST_URL = `${config.updates.default}/${process.platform}/latest.json`
	var UPDATES_DIR = path.resolve(require('os').tmpdir(), 'Quirkbot')
	var UPDATER_BIN_NAME = /^win/.test(process.platform) ? 'updater.exe' : 'updater'
	// Download manifest
	utils.pass()
	.then(utils.logLabel('AUTOUPDATE: Starting...'))
	.then(() => {
		if(process.platform == 'linux'){
			throw 'Linux does not support auto update'
		}
	})
	.then(utils.logLabel(`AUTOUPDATE: Downloading manifest from: ${UPDATES_MANIFEST_URL}...`))
	.then(() => fetch(UPDATES_MANIFEST_URL))
	.then(response => response.json())
	.then(manifest => {
		if(manifest.version != pkg.version){
			console.log('AUTOUPDATE: Update manifest', manifest)
			return manifest
		}
		else {
			throw 'App is up to date!'
		}
	})
	.then(utils.logLabel(`AUTOUPDATE: Using update directory: ${UPDATES_DIR}`))
	.then(utils.mkdir(UPDATES_DIR))
	// Donwload the src (or skip if already donwloaded)
	.then(utils.logLabel('AUTOUPDATE: Grabbing source...'))
	.then(manifest => {
		return new Promise((resolve, reject) => {
			const sourceTempDest = path.resolve(UPDATES_DIR, '.update.zip')
			const sourceFinalDest = path.resolve(UPDATES_DIR, `${manifest.version}.zip`)
			const sourceUrl = `${config.updates.default}/${process.platform}/${manifest.src.path}`
			utils.pass(manifest)
			.then(utils.checkStat(sourceFinalDest))
			.then(utils.logLabel(`AUTOUPDATE: Source already downloaded at ${sourceFinalDest}`))
			.then(() => resolve(manifest))
			.catch(() => {
				utils.pass()
				.then(utils.logLabel(`AUTOUPDATE: Clearing temp destination: ${sourceTempDest}`))
				.then(utils.deleteFile(sourceTempDest))
				.then(utils.logLabel(`AUTOUPDATE: Downloading source from: ${sourceUrl}`))
				.then(() => {
					return new Promise( (resolve, reject) =>{
						const http = /^https/.test(sourceUrl) ? require('https') : require('http')
						http.get(sourceUrl, res => {
							if (res.statusCode !== 200) {
								return reject(new Error(res.statusMessage))
							}
							res.pipe(fs.createWriteStream(sourceTempDest))
							.on('finish', () => {
								utils.pass(manifest)
								.then(utils.logLabel('AUTOUPDATE: Moving source from temporary to final destination'))
								.then(utils.moveFile(
									sourceTempDest,
									sourceFinalDest
								))
								.then(resolve)
								.catch(reject)
							})
							.on('error', err => reject(err))
						})
					})
				})
				.then(utils.logLabel('AUTOUPDATE: Source successfully donwloaded!'))
				.then(resolve)
				.catch(reject)
			})
		})

	})
	// Notify user about the update
	.then(utils.logLabel('AUTOUPDATE: Displaying notification to user...'))
	.then(manifest => {
		return new Promise((resolve, reject) => {
			const options = {
				icon: 'assets/icon.png',
				body: 'Click here to install',
				requireInteraction: true
			}
			const notification = new Notification('A new update is available!', options)
			notification.onclick = () => {
				notification.close()
				resolve(manifest)
			}
			notification.onclose = () => reject('User closed the update notification.')
		})
	})
	// Copy the update binary to the update dir
	.then(utils.logLabel(`AUTOUPDATE: Moving updater binary to ${path.resolve(UPDATES_DIR, UPDATER_BIN_NAME)}`))
	.then(utils.copyFile(
		path.resolve(UPDATER_BIN_NAME),
		path.resolve(UPDATES_DIR, UPDATER_BIN_NAME)
	))
	.then(utils.chmod(
		path.resolve(UPDATES_DIR, UPDATER_BIN_NAME),
		755 & ~process.umask()
	))
	// Run the update binary
	.then(manifest => {
		let instDir
		switch (process.platform) {
		case 'darwin':
			instDir = path.resolve('./../../../../')
			break
		case 'win32':
			instDir = path.dirname(path.resolve('./'))
			break
		}

		const args = [
			path.resolve(UPDATES_DIR, UPDATER_BIN_NAME),
			[
				'--bundle', path.resolve(UPDATES_DIR, `${manifest.version}.zip`),
				'--inst-dir', instDir,
				'--app-name', pkg['executable-name']
			],
			{
				cwd: path.dirname(UPDATES_DIR),
				detached: true,
				stdio: 'ignore',
			}
		]
		return utils.pass()
		.then(utils.logLabel(`AUTOUPDATE: Running updater:\n${JSON.stringify(args)}`))
		.then(() => require('child_process').spawn.apply(this, args).unref())
	})
	.then(utils.logLabel('AUTOUPDATE: Quitting app...'))
	.then(() => window.nw.App.quit())
	.catch(error => console.error('AUTOUPDATE: Canceled.', error))

	// Graceful shutdown, kind of
	process.on('SIGQUIT', () => process.exit())
	process.on('SIGHUP', () => process.exit())
	process.on('SIGINT', () => process.exit()) // catch ctrl-c
	process.on('SIGTERM', () => process.exit()) // catch kill
}