var glog = require('gulp-api-log')
var gulp = require('./gulpfile.js')
glog(gulp)

if(process.argv.length > 2){
	var argv = process.argv.slice(2)
	gulp.start(argv)
}