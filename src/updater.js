	/*

	 1. Check the manifest for version (from your running "old" app).
	 2. If the version is different from the running one, download new package to a temp directory.
	 3. Unpack the package in temp.
	 4. Run new app from temp and kill the old one (i.e. still all from the running app).
	 5. The new app (in temp) will copy itself to the original folder, overwriting the old app.
	 6. The new app will run itself from original folder and exit the process.

	*/

	var gui = window.require('nw.gui');
	var pkg = require('./package.json'); // Insert your app's manifest here
	var updater = require('node-webkit-updater');
	var upd = new updater(pkg);
	var copyPath, execPath;

	// Args passed when new app is launched from temp dir during update
	if(gui.App.argv.length) {
		process.stdout.write( 'UPDATER: Args passed when new app is launched from temp dir during update\n')
			// ------------- Step 5 -------------
			copyPath = gui.App.argv[0];
			execPath = gui.App.argv[1];

			// Replace old app, Run updated app from original location and close temp instance
			upd.install(copyPath, function(err) {
				if(!err) {
					// ------------- Step 6 -------------
					process.stdout.write( 'UPDATER: Replace old app, Run updated app from original location and close temp instance\n')
					upd.run(execPath, null);
					gui.App.quit();
				}
		});
	}
	else { // if no arguments were passed to the app

		process.stdout.write( 'UPDATER: no arguments were passed to the app\n')
			// ------------- Step 1 -------------
			upd.checkNewVersion(function(error, newVersionExists, manifest) {
				process.stdout.write( 'UPDATER: upd.checkNewVersion\n')
					if (!error && newVersionExists) {
					process.stdout.write( 'UPDATER: !error && newVersionExists\n')

						// ------------- Step 2 -------------
						upd.download(function(error, filename) {
							process.stdout.write( 'UPDATER: upd.download\n')
							if (!error) {
								process.stdout.write( 'UPDATER: upd.download !error\n')

								// ------------- Step 3 -------------
								upd.unpack(filename, function(error, newAppPath) {
									process.stdout.write( 'UPDATER: upd.unpack\n')
										if (!error) {
											process.stdout.write( 'UPDATER: upd.unpack !error\n')

											process.stdout.write( 'UPDATER: got here just fine\n')
											process.stdout.write( 'UPDATER: filename '+filename+'\n')
											process.stdout.write( 'UPDATER: newAppPath '+newAppPath+'\n')
											process.stdout.write( 'UPDATER: upd.getAppPath() '+upd.getAppPath()+'\n')
											process.stdout.write( 'UPDATER: upd.getAppExec() '+upd.getAppExec()+'\n')

											// ------------- Step 4 -------------
											// Run the temp app with 2 arguments: where we are copying
											// the tmp folder to and the executable file there
											upd.runInstaller(newAppPath, [upd.getAppPath(), upd.getAppExec()],{});
											gui.App.quit();
										}
								}, manifest);
							}
					}, manifest);
				}
			});
	}
