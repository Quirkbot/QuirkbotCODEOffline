var express = require( 'express' )
var fork = require( 'child_process' ).fork
var path = require( 'path' )
var modulePath = function( module ){
	return path.resolve( require.resolve( path.join( module, 'package.json' ) ), '..' )
}

// Load configuration file
var config = require( './config.json' )

// Prepare the environment variables
process.env.NODE_ENV = 'lite';

var apiEnv = {
	NODE_ENV: 'lite',
	DISK_DB_PATH: 'db' + path.sep,
	PORT: config.ports.api,
	LITE_NICKNAME: config.credentials.nickname,
	LITE_PASSWORD: config.credentials.password,
	LITE_EMAIL: config.credentials.email
}

var compilerEnv = {
	NODE_ENV: 'lite',
	DISK_DB_PATH: 'db' + path.sep,
	PORT: config.ports.compiler,
	WEB_CONCURRENCY: 1
}

for (e in process.env) {
	apiEnv[e] = process.env[e];
	compilerEnv[e] = process.env[e];
}

var startApi = function() {
	fork(
		path.resolve( modulePath( 'quirkbot-data-api' ), 'app.js' ),
		{ env: apiEnv}
	)
}

var startCompilerServer = function() {
	fork(
		path.resolve( modulePath( 'quirkbot-compiler' ), 'server.js' ),
		{ env: compilerEnv	}
	)
}

var startCompilerWorker = function() {
	fork(
		path.resolve( modulePath( 'quirkbot-compiler' ), 'compiler.js' ),
		{ env: compilerEnv	}
	);
}

var startCode = function() {
	var code = express()
	code.use( express.static( 'code' ) )
	code.listen( config.ports.code )
}

startApi();
startCompilerServer();
startCompilerWorker();
startCode();

// Graceful shutdown, kind of
var cleanExit = function() {
	console.log('Trying a clean exit');
	process.exit();
};
process.on( 'SIGINT', cleanExit ) // catch ctrl-c
process.on( 'SIGTERM', cleanExit ) // catch kill
