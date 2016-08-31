var express = require( 'express' )
var fork = require( 'child_process' ).fork
var path = require( 'path' )
var modulePath = function( module ){
	return path.resolve( require.resolve( path.join( module, 'package.json' ) ), '..' )
}

// Load configuration file
var config = require( path.resolve( __dirname, 'config.json' ) )

// Set global environment
process.env.NODE_ENV = "lite"

var startApi = function() {
	// Start api
	process.env.DISK_DB_PATH = path.resolve( __dirname, 'db', 'api.db' )
	process.env.PORT = config.ports.api
	process.env.LITE_NICKNAME = config.credentials.nickname
	process.env.LITE_PASSWORD = config.credentials.password
	process.env.LITE_EMAIL = config.credentials.email
	var api = require(
		path.resolve( modulePath( 'quirkbot-api' ), 'app.js' )
	)
}

var startCompiler = function() {
	// Start compiler process
	process.env.DISK_DB_PATH = path.resolve( __dirname, 'db', 'compiler.db' )
	process.env.PORT = config.ports.compiler
	process.env.WEB_CONCURRENCY = 1
	var compilerServer = fork(
		path.resolve( modulePath( 'quirkbot-compiler' ), 'server.js' )
	)
	var compilerWorker = fork(
		path.resolve( modulePath( 'quirkbot-compiler' ), 'compiler.js' )
	)
}

var startCode = function() {
	// Serve CODE;
	var code = express()
	code.use( express.static( path.resolve( __dirname, 'dist_polymer' ) ) )
	code.listen( config.ports.code )
}

startApi()
startCompiler()
startCode()

// Graceful shutdown, kind of
var cleanExit = function() { process.exit() }
process.on( 'SIGINT', cleanExit ) // catch ctrl-c
process.on( 'SIGTERM', cleanExit ) // catch kill
