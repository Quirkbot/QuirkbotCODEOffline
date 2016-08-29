var express = require('express')
var fork = require('child_process').fork
var path = require('path')

var modulePath = function( module ){
	return path.resolve( require.resolve( path.join( module, 'package.json' ) ), '..' )
}

// Serve CODE;
process.env.PORT = 9510
var code = express()
code.use( express.static( path.resolve( __dirname, 'dist_polymer' ) ) )
code.listen( process.env.PORT || 8000 )

// Start compiler process
process.env.NODE_ENV = "lite"
process.env.PORT = 9511
process.env.MONGO_URL = "tingodb://compiler_db"
process.env.WEB_CONCURRENCY = 1
var compilerServer = fork(
	path.resolve( modulePath( 'quirkbot-compiler' ), 'server.js' )
)
var compilerWorker = fork(
	path.resolve( modulePath( 'quirkbot-compiler' ), 'compiler.js' )
)

// Start api
process.env.PORT = 9512
process.env.NODE_ENV = "lite"
process.env.DB_URL = path.resolve( 'api_db' );
var api = require(
	path.resolve( modulePath( 'quirkbot-api' ), 'app.js' )
)

var cleanExit = function() { process.exit() }
process.on( 'SIGINT', cleanExit ) // catch ctrl-c
process.on( 'SIGTERM', cleanExit ) // catch kill
