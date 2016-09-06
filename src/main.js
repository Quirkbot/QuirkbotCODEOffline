var path = require( 'path' );
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
require(path.resolve( modulePath( 'quirkbot-compiler' ), 'server.js' ));
require(path.resolve( modulePath( 'quirkbot-compiler' ), 'compiler.js' ));

////////////////////////////////////////////////////////////////////////////////
var cluster = require('cluster');
if(!cluster.isMaster) return;
////////////////////////////////////////////////////////////////////////////////
// Everything from here on will only be executed once (outside cluster)

// Iniitialize API
require(path.resolve( modulePath( 'quirkbot-data-api' ), 'app.js' ));

// Iniitialize CODE
var express = require( 'express' );
var code = express();
code.use( express.static( 'code' ) );
code.listen( config.ports.code );

// Graceful shutdown, kind of
var cleanExit = function() {
	console.log('Trying a clean exit');
	process.exit();
};
process.on( 'SIGINT', cleanExit ) // catch ctrl-c
process.on( 'SIGTERM', cleanExit ) // catch kill
