'use strict'
var fs = require('fs')
var fork = require('child_process').fork
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
			exec(command, {maxBuffer: 1024 * 500}, function (error, stdout, stderr) {

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
				resolve.apply(null, payload)
				/*if (error) {
					reject(error)
					return
				}
				resolve.apply(null, payload)*/
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

var chmod = function(path, mode){
	return function(){
		var payload = arguments
		var promise = function(resolve, reject){
			fs.chmod(path, mode, function (error) {
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
exports.chmod = chmod

var copyFile = function(src, dst){
	return function(){
		var payload = arguments
		var promise = function(resolve, reject){
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
		var payload = arguments
		var promise = function(resolve, reject){
			fs.mkdir(path, function(error) {
				resolve.apply(null, payload)
			})
		}
		return new Promise(promise)
	}
}
exports.mkdir = mkdir


var logLabel = function(){
	var message = arguments
	return function(){
		var payload = arguments
		var promise = function(resolve){
			for (var i = 0; i < message.length; i++) {
				console.log(message[i])
			}
			resolve.apply(null, payload)
		}
		return new Promise(promise)
	}
}
exports.logLabel = logLabel

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
	return function(){
		var promise = function(resolve, reject){
			var net = require('net')
			var tester = net.createServer()
			.once('error', function (err) {
				if (err.code === 'EADDRINUSE') {
					reject(err)
				}
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
}
exports.portAvailable = portAvailable

var portBusy = function(port) {
	return function(){
		var promise = function(resolve, reject){
			var net = require('net')
			var tester = net.createServer()
			.once('error', function (err) {
				console.log(err)
				if (err.code === 'EADDRINUSE') {
					resolve()
				}
			})
			.once('listening', function() {
				tester.once('close', function() {
					return reject('Port is free')
				})
				.close()
			})
			.listen(port)
		}
		return new Promise(promise)
	}
}
exports.portBusy = portBusy

var loadScriptToDom = function(src) {
	return new Promise((resolve, reject) => {
		const script = document.createElement('script')
		let loaded
		script.setAttribute('src', src)
		let timeout = window.setTimeout(reject, 10000)
		script.onreadystatechange = script.onload = function() {
			if (!loaded) {
				window.clearTimeout(timeout)
				resolve()
			}
			loaded = true
		}
		document.getElementsByTagName('head')[0].appendChild(script)
	})
}
exports.loadScriptToDom = loadScriptToDom

var forkProcess = function(path) {
	return new Promise((resolve) => {
		var f = fork(path)
		process.on('exit', () => f.kill())
		resolve()
	})
}
exports.forkProcess = forkProcess