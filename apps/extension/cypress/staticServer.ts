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
};

// `wxt build` emits absolute asset URLs ("/chunks/popup-*.js"), which only resolve if the popup is
// served from a document root rather than opened off the filesystem. This is that root — a static
// server over .output/chrome-mv3 and nothing else, so an E2E run exercises the same bundle a
// reviewer installs rather than a re-bundled copy of the source.
export const startStaticServer = (rootDir: string, port: number): Promise<Server> => {
	const server = createServer((req, res) => {
		const requestPath = new URL(req.url ?? '/', 'http://localhost').pathname;
		const filePath = join(rootDir, normalize(requestPath));

		// normalize() collapses "..", so anything still outside the root was an escape attempt.
		if (!filePath.startsWith(rootDir + sep)) {
			res.writeHead(403).end('Forbidden');
			return;
		}
		if (!existsSync(filePath) || !statSync(filePath).isFile()) {
			res.writeHead(404).end('Not found');
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
