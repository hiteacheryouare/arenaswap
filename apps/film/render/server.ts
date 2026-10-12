import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import { extname, join, normalize, sep } from 'node:path';
import type { AddressInfo } from 'node:net';

const mimeTypes: Record<string, string> = {
	'.css': 'text/css',
	'.html': 'text/html',
	'.js': 'text/javascript',
	'.json': 'application/json',
	'.png': 'image/png',
	'.svg': 'image/svg+xml',
	'.woff': 'font/woff',
	'.woff2': 'font/woff2',
};

export const filmPrefix = '/film/';

// `wxt build` emits root-absolute asset URLs, so the extension owns the document root and the stage
// lives under a prefix beside it. Same origin for both is what lets the stage script the popups.
const shimTag = `<script src="${filmPrefix}popupShim.js"></script>`;

const resolveInside = (root: string, requestPath: string): string | null => {
	const file = join(root, normalize(decodeURIComponent(requestPath)));
	return file.startsWith(root + sep) ? file : null;
};

export interface FilmServer {
	origin: string;
	close: () => Promise<void>;
}

export const dataPrefix = `${filmPrefix}data/`;

const startFilmServer = (extensionRoot: string, stageRoot: string, dataRoot: string): Promise<FilmServer> => {
	const server: Server = createServer((request, response) => {
		const path = new URL(request.url ?? '/', 'http://localhost').pathname;
		const file = path.startsWith(dataPrefix)
			? resolveInside(dataRoot, path.slice(dataPrefix.length))
			: path.startsWith(filmPrefix)
				? resolveInside(stageRoot, path.slice(filmPrefix.length))
				: resolveInside(extensionRoot, path);

		if (!file || !existsSync(file) || !statSync(file).isFile()) {
			response.writeHead(404).end();
			return;
		}

		const headers = { 'Content-Type': mimeTypes[extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' };
		if (path === '/popup.html' || path === '/guide.html') {
			const page = readFileSync(file, 'utf8').replace('<head>', `<head>${shimTag}`);
			response.writeHead(200, headers).end(page);
			return;
		}
		response.writeHead(200, headers);
		createReadStream(file).pipe(response);
	});

	return new Promise((resolve, reject) => {
		server.once('error', reject);
		server.listen(0, '127.0.0.1', () => {
			const { port } = server.address() as AddressInfo;
			resolve({
				origin: `http://127.0.0.1:${port}`,
				close: () => new Promise(done => server.close(() => done())),
			});
		});
	});
};

export default startFilmServer;
