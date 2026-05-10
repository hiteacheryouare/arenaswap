'use strict';

const { execFileSync } = require('child_process');
const path = require('path');

const scriptsDir = __dirname;

if (process.platform === 'win32') {
	execFileSync(
		'powershell',
		['-ExecutionPolicy', 'Bypass', '-File', path.join(scriptsDir, 'zip-builds.ps1')],
		{ stdio: 'inherit' }
	);
} else {
	execFileSync('bash', [path.join(scriptsDir, 'zip-builds.sh')], { stdio: 'inherit' });
}
