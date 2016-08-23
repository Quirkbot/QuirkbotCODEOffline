require( 'dotenv' ).config();
var express = require( 'express' )
var fork = require('child_process').fork;
// TODO: Start api
// Start compiler process
var compilerServer = fork( './compiler/server.js' )
var compilerWorker = fork( './compiler/compiler.js' )
// Serve CODE;
var code = express()
code.use( express.static( './dist_polymer' ) )
code.listen( 8888 )
