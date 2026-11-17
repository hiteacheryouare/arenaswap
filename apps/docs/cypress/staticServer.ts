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

export const startStaticServer = (rootDir: string, basePath: string, port: number): Promise<Server> => {
	const server = createServer((req, res) => {
		const requestPath = new URL(req.url ?? '/', 'http://localhost').pathname;

		if (!requestPath.startsWith(basePath)) {
			res.writeHead(404).end('Not found');
			return;
		}

		const relative = requestPath.slice(basePath.length);
		let filePath = join(rootDir, normalize(`/${relative}`));

		if (filePath !== rootDir && !filePath.startsWith(rootDir + sep)) {
			res.writeHead(403).end('Forbidden');
			return;
		}

		if (existsSync(filePath) && statSync(filePath).isDirectory()) {
			filePath = join(filePath, 'index.html');
		}

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
