/*var fs = require( 'fs' )
fs.writeFileSync(
	'/Users/paulobarcelos/Desktop/test.txt',
	`${process.cwd()}
	${process.execPath}
	`
)
*/
// This will be called by main.html
// We init like this so window (and window.nw) are avaiable to the node process
exports.init = function() {
	require('./main.js')
}
