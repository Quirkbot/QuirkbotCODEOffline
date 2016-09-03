var gulp = require('gulp');
require('./gulpfile.js');

if(process.argv.length > 2){
  var argv = process.argv.slice(2);
  gulp.start(argv);
}