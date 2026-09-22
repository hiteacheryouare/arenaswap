import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import { extname, join, normalize, sep } from 'node:path';

const mimeTypes: Record<string, string> = {
	'.css':   'text/css',
	'.html':  'text/html',
	'.js':    'text/javascript',
	'.json':  'application/json',
	'.png':   'image/png',
	'.svg':   'image/svg+xml',
	'.ttf':   'font/ttf',
	'.woff':  'font/woff',
	'.woff2': 'font/woff2',
	'.xml':   'application/xml',
};

// A near-copy of apps/extension/cypress/staticServer.ts, with one difference that is the whole
// reason it is not shared: this site is built for a base path, so every URL in the output starts
// `/arenaswap/`. The server takes that prefix and strips it, which means a spec can visit the same
// path GitHub Pages will serve rather than a rewritten one.
//
// Directory URLs resolve to their index.html, because `astro build` writes `faq/index.html` and the
// pages link to `faq/`.
export const startStaticServer = (rootDir: string, basePath: string, port: number): Promise<Server> => {
	const server = createServer((req, res) => {
		const requestPath = new URL(req.url ?? '/', 'http://localhost').pathname;

		if (!requestPath.startsWith(basePath)) {
			res.writeHead(404).end('Not found');
			return;
		}

		const relative = requestPath.slice(basePath.length);
		let filePath = join(rootDir, normalize(`/${relative}`));

		// normalize() collapses "..", so anything still outside the root was an escape attempt.
		if (filePath !== rootDir && !filePath.startsWith(rootDir + sep)) {
			res.writeHead(403).end('Forbidden');
			return;
		}

		if (existsSync(filePath) && statSync(filePath).isDirectory()) {
			filePath = join(filePath, 'index.html');
		}

		// GitHub Pages answers an unknown path under the base with 404.html and a 404 status, which
		// is the only way that page is ever reached. Serving plain text here meant the site's most
		// visited error page could not be opened by a spec at all.
		if (!existsSync(filePath) || !statSync(filePath).isFile()) {
			const notFoundPage = join(rootDir, '404.html');
			if (!existsSync(notFoundPage)) {
				res.writeHead(404).end('Not found');
				return;
			}
			res.writeHead(404, { 'Content-Type': 'text/html', 'Cache-Control': 'no-store' });
			createReadStream(notFoundPage).pipe(res);
			return;
		}

		res.writeHead(200, {
			'Content-Type': mimeTypes[extname(filePath)] ?? 'application/octet-stream',
			'Cache-Control': 'no-store',
		});
		createReadStream(filePath).pipe(res);
	});

	return new Promise((resolve, reject) => {
		server.once('error', reject);
		server.listen(port, '127.0.0.1', () => resolve(server));
	});
};
