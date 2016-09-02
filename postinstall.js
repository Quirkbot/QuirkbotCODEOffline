console.log( 'POST INSTALL' );
var path = require( 'path' );

var gulp = require( path.resolve( './', 'gulpfile.js' ) );
gulp.start( 'build' )
