require( 'dotenv' ).config();
var express = require( 'express' )
var fork = require('child_process').fork;
// TODO: Start api
// TODO: Start compiler process
// Serve CODE;
var code = express()
code.use( express.static( './dist_polymer' ) )
code.listen( 8888 )
