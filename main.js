var express = require( 'express' )
var fork = require( 'child_process' ).fork
var path = require( 'path' )
var modulePath = function( module ){
	return path.resolve( require.resolve( path.join( module, 'package.json' ) ), '..' )
}

// Load configuration file
var config = require( path.resolve( __dirname, 'config.json' ) )
var apiEnv = {
	NODE_ENV: "lite",
	DISK_DB_PATH: path.resolve( __dirname, './db' ) + path.sep,
	PORT: config.ports.api,
	LITE_NICKNAME: config.credentials.nickname,
	LITE_PASSWORD: config.credentials.password,
	LITE_EMAIL: config.credentials.email
}
var compilerEnv = {
	NODE_ENV: "lite",
	DISK_DB_PATH: path.resolve( __dirname, 'db' ),
	PORT: config.ports.compiler,
	WEB_CONCURRENCY: 1,
}

var startApi = function() {
	var api = fork(
		path.resolve( modulePath( 'quirkbot-api' ), 'app.js' ),
		{ env: apiEnv	}
	)
}

var startCompiler = function() {
	// Start compiler process
	var compilerServer = fork(
		path.resolve( modulePath( 'quirkbot-compiler' ), 'server.js' ),
		{ env: compilerEnv	}
	)
	var compilerWorker = fork(
		path.resolve( modulePath( 'quirkbot-compiler' ), 'compiler.js' ),
		{ env: compilerEnv	}
	)
}

var startCode = function() {
	// Serve CODE;
	process.env.NODE_ENV = "lite"
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
