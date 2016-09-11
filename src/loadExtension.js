let loadScript = (src) => {
	return new Promise((resolve, reject) => {
		const script = document.createElement('script')
		let loaded
		script.setAttribute('src', src)
		let timeout = window.setTimeout(reject, 1000)
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
fetch('/extension/manifest.json')
.then(response => response.json())
.then(manifest => manifest.app.background.scripts)
.then(scripts => {
	let firstScripts = scripts.slice(0)
	firstScripts.pop()
	let promises = firstScripts.map(src => loadScript(`/extension/${src}`))

	return Promise.all(promises)
	.then(() => scripts)
})
.then(scripts => loadScript(`/extension/${scripts.pop()}`))