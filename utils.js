'use strict'
var Promise = require('es6-promise').Promise
var fs = require('fs')
var archiver = require('archiver')
var ncp = require('ncp')
var rimraf = require('rimraf')
var path = require('path')
var exec = require('child_process').exec

var pass = function(){
	var payload = arguments
	var promise = function(resolve){
		resolve.apply(null, payload)
	}
	return new Promise(promise)
}
exports.pass = pass

var execute = function(command, resolveError){
	return function(){

		var promise = function(resolve, reject){
			console.log(command)
			exec(command, {maxBuffer: 1024 * 99999}, function (error, stdout, stderr) {

				if (!resolveError && error !== null){
					reject(stderr)
				}
				else resolve({stdout:stdout, stderr:stderr})
			})
		}
		return new Promise(promise)
	}
}
exports.execute = execute

var writeFile = function(path, content){
	return function(){
		var payload = arguments

		var promise = function(resolve, reject){
			fs.writeFile(path, content, function (error) {
				if (error) {
					reject(error)
					return
				}
				resolve.apply(null, payload)
			})
		}
		return new Promise(promise)
	}
}
exports.writeFile = writeFile

var deleteFile = function(path){
	return function(){
		var payload = arguments
		var promise = function(resolve, reject){
			fs.unlink(path, function (error) {
				if (error) {
					reject(error)
					return
				}
				resolve.apply(null, payload)
			})
		}
		return new Promise(promise)
	}
}
exports.deleteFile = deleteFile

var moveFile = function(path, newPath){
	return function(){
		var payload = arguments
		var promise = function(resolve, reject){
			fs.rename(path, newPath, function (error) {
				if (error) {
					reject(error)
					return
				}
				resolve.apply(null, payload)
			})
		}
		return new Promise(promise)
	}
}
exports.moveFile = moveFile

var readFile = function(path){
	return function(){
		var promise = function(resolve, reject){
			fs.readFile(path, 'utf-8', function read(error, data) {
				if (error) {
					reject(error)
					return
				}
				resolve(data)
			})
		}
		return new Promise(promise)
	}
}
exports.readFile = readFile

var checkStat = function(path){
	return function(){
		var promise = function(resolve, reject){
			fs.stat(path, function (error, stat) {
				if (error) {
					reject(error)
					return
				}
				resolve(stat)
			})
		}
		return new Promise(promise)
	}
}
exports.checkStat = checkStat

var readDir = function(path){
	return function(){

		var promise = function(resolve, reject){
			fs.readdir(path, function read(error, files) {
				if (error) {
					reject(error)
					return
				}
				resolve(files)
			})
		}
		return new Promise(promise)
	}
}
exports.readDir = readDir

var zipDir = function(src, dst, root) {
	return function(){
		return new Promise(function(resolve, reject) {

			var output = fs.createWriteStream(dst)
			var archive = archiver('zip')

			output.on('close', function() {
				console.log(archive.pointer() + ' total bytes')
				console.log('archiver has been finalized and the output file descriptor has closed.')
				resolve()
			})

			archive.on('error', function(err) {
				reject(err)
			})

			archive.pipe(output)

			archive.directory(src, root)

			archive.finalize()
		})
	}
}
exports.zipDir = zipDir

var copyDir = function(source, destination){
	return function(){
		var payload = arguments

		var promise = function(resolve, reject){
			ncp(source, destination, function (error) {
				if (error) {
					reject(error)
					return
				}
				resolve.apply(null, payload)
			})
		}
		return new Promise(promise)
	}
}
exports.copyDir = copyDir

var copyFile = function(src, dst){
	return function(){
		var payload = arguments
		var promise = function(resolve, reject){
			console.log('copy', src,dst)
			var rd = fs.createReadStream(src)
			rd.on('error', reject)

			var wr = fs.createWriteStream(dst)
			wr.on('error', reject)
			wr.on('close', () => resolve.apply(null, payload))
			rd.pipe(wr)
		}
		return new Promise(promise)
	}
}
exports.copyFile = copyFile


var findFiles = function(startPath, filter, files){
	files = files || []

	return function(){
		var promise = function (resolve, reject) {
			pass()
			.then(readDir(startPath))
			.then(function(list){
				var promises = list.map(function (item) {
					return new Promise(function(resolveInternal, rejectInternal) {
						pass()
						.then(checkStat(path.join(startPath, item)))
						.then(function (stat) {
							if (stat.isDirectory()) {
								pass()
								.then(findFiles(path.join(startPath, item), filter, files))
								.then(resolveInternal)
								.catch(rejectInternal)
							} else if (item.indexOf(filter) >= 0) {
								files.push(path.join(startPath, item))
								resolveInternal()
							} else {
								resolveInternal()
							}
						})
						.catch(rejectInternal)
					})
				})
				return Promise.all(promises)
			})
			.then(function () {
				resolve(files)
			})
			.catch(reject)
		}
		return new Promise(promise)
	}
}
exports.findFiles = findFiles

var mkdir = function(path){
	return function(){

		var promise = function(resolve, reject){
			fs.mkdir(path, function(error) {
				if (error) {
					reject(error)
					return
				}
				resolve()
			})
		}
		return new Promise(promise)
	}
}
exports.mkdir = mkdir

var deleteDir = function(path){
	return function(){
		var promise = function(resolve, reject){
			rimraf(path, function(error) {
				if (error) {
					reject(error)
					return
				}
				resolve()
			})
		}
		return new Promise(promise)
	}
}
exports.deleteDir = deleteDir

var log = function(){
	var payload = arguments
	var promise = function(resolve){
		for (var i = 0; i < payload.length; i++) {
			console.log(payload[i])
		}
		resolve.apply(null, payload)
	}
	return new Promise(promise)
}
exports.log = log

var delay = function(millis){
	return function(){
		var payload = arguments
		var promise = function(resolve){
			setTimeout(function(){
				resolve.apply(null, payload)
			}, millis)

		}
		return new Promise(promise)
	}
}
exports.delay = delay

var modulePath = function(module){
	return path.resolve(require.resolve(path.join(module, 'package.json')), '..')
}
exports.modulePath = modulePath

var portAvailable = function(port) {
	var promise = function(resolve, reject){
		var net = require('net')
		var tester = net.createServer()
		.once('error', function (err) {
			reject(err)
		})
		.once('listening', function() {
			tester.once('close', function() {
				return resolve()
			})
			.close()
		})
		.listen(port)
	}
	return new Promise(promise)
}
exports.portAvailable = portAvailable