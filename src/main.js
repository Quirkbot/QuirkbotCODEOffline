var path = require( 'path' );
var fork = require( 'child_process' ).fork;
var modulePath = function( module ){
	return path.resolve( require.resolve( path.join( module, 'package.json' ) ), '..' );
}

// Load configuration file
var config = require( './config.json' )

// Prepare the environment variables
process.env.NODE_ENV = 'lite';
process.env.API_DISK_DB_PATH = 'db' + path.sep;
process.env.COMPILER_DISK_DB_PATH = 'db' + path.sep;
process.env.API_PORT = config.ports.api;
process.env.COMPILER_PORT = config.ports.compiler;
process.env.LITE_NICKNAME = config.credentials.nickname;
process.env.LITE_PASSWORD = config.credentials.password;
process.env.LITE_EMAIL = config.credentials.email;
process.env.WEB_CONCURRENCY = 1;

// Initialized COMPILER (cluster based)
var compilerServer = fork(path.resolve( modulePath( 'quirkbot-compiler' ), 'server.js' ));
var compilerWorker = fork(path.resolve( modulePath( 'quirkbot-compiler' ), 'compiler.js' ));

// Iniitialize API
var api = fork(path.resolve( modulePath( 'quirkbot-data-api' ), 'app.js' ));

// Iniitialize CODE
var express = require( 'express' );
var code = express();
code.use( express.static( 'code' ) );
code.listen( config.ports.code );

// Graceful shutdown, kind of
var cleanExit = function() {
	process.exit();
};
process.on( 'SIGQUIT', cleanExit )
process.on( 'SIGHUP', cleanExit )
process.on( 'SIGINT', cleanExit ) // catch ctrl-c
process.on( 'SIGTERM', cleanExit ) // catch kill

process.on('exit', function() {
	compilerServer.kill('SIGINT');
	compilerWorker.kill('SIGINT');
	api.kill('SIGINT');
})
