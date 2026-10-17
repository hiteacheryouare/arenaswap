/// <reference types="node" />
// Runs in the build, not the browser: Vite and Cypress load it from their configs.
import { readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import tokenPrefix from './tokenPrefix';

const require = createRequire(join(process.cwd(), 'package.json'));
const scriptDir = dirname(require.resolve('bootstrap'));

export default tokenPrefix({
	css: readFileSync(require.resolve('bootstrap/dist/css/bootstrap.css'), 'utf8'),
	scripts: readdirSync(scriptDir, { recursive: true, encoding: 'utf8' })
		.filter((file) => file.endsWith('.js'))
		.map((file) => readFileSync(join(scriptDir, file), 'utf8')),
});
