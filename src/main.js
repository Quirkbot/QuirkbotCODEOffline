var fork = require( 'child_process' ).fork
var path = require( 'path' )
var fs = require( 'fs' )
var utils = require( './utils.js' )

// Load configuration file
var config = require( path.resolve( './', 'config.json' ) )

// Create database folder if needed
var dbPath = path.resolve( window.nw.App.dataPath, 'quirkbot-lite-db' ) + path.sep

if( !fs.existsSync( dbPath ) ) {
	console.log( 'creating databases directory' )
	console.log( dbPath )
	fs.mkdirSync( dbPath )
} else {
	console.log( 'found database folder', dbPath )
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
var express = require( 'express' )
var code = express()
code.use( express.static( 'code' ) )
code.listen( config.ports.code )

// Iniitialize API
var api = fork( path.resolve( utils.modulePath( 'quirkbot-data-api' ), 'app.js' ) )

// Initialized COMPILER
var compilerServer = fork( path.resolve( utils.modulePath( 'quirkbot-compiler' ), 'server.js' ) )
var compilerWorker = fork( path.resolve( utils.modulePath( 'quirkbot-compiler' ), 'compiler.js' ) )

// Graceful shutdown, kind of
var cleanExit = function() {
	process.exit()
}
process.on( 'SIGQUIT', cleanExit )
process.on( 'SIGHUP', cleanExit )
process.on( 'SIGINT', cleanExit ) // catch ctrl-c
process.on( 'SIGTERM', cleanExit ) // catch kill

process.on( 'exit', function() {
	compilerServer.kill('SIGINT')
	compilerWorker.kill('SIGINT')
	api.kill('SIGINT')
})
