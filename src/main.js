exports.init = function() {
	var path = require('path')
	var http = require('http')
	var url = require('url')
	var fs = require('fs')
	var utils = require('./utils.js')

	// Load configuration file
	var config = require( path.resolve('./', 'config.json') )

	// Create database folder if needed
	var dbPath = path.resolve( window.nw.App.dataPath, 'quirkbot-lite-db') + path.sep

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
	process.env.COMPILER_DISK_DB_PATH = dbPath
	process.env.API_PORT = config.ports.api
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

	// Graceful shutdown, kind of
	process.on('SIGQUIT', () => process.exit())
	process.on('SIGHUP', () => process.exit())
	process.on('SIGINT', () => process.exit()) // catch ctrl-c
	process.on('SIGTERM', () => process.exit()) // catch kill
}