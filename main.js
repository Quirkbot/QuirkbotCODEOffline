var express = require( 'express' )
var fork = require('child_process').fork

// Serve CODE;
process.env.PORT = 8000
var code = express()
code.use( express.static( __dirname + '/dist_polymer' ) )
code.listen( process.env.PORT || 8000 )

// Start compiler process
process.env.NODE_ENV = "lite"
process.env.PORT = 8001
process.env.MONGO_URL = "tingodb://compiler_db"
process.env.WEB_CONCURRENCY = 1
var compilerServer = fork( './compiler/server.js' )
var compilerWorker = fork( './compiler/compiler.js' )

// Start api
process.env.PORT = 8002
process.env.NODE_ENV = "lite"
var api = require( './api/app' )

var cleanExit = function() { process.exit() }
process.on( 'SIGINT', cleanExit ) // catch ctrl-c
process.on( 'SIGTERM', cleanExit ) // catch kill
