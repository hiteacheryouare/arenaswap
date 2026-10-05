import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { CdpConnection } from './cdp';

interface CachedResponse {
	status: number;
	contentType: string;
}

// Crests, league marks and anything else the popup pulls straight off our sources' CDN. The first
// render downloads each one once; every render after that is offline and byte-identical.
export const remoteHosts = ['*://a.espncdn.com/*', '*://*.espncdn.com/*', '*://site.api.espn.com/*', '*://sports.core.api.espn.com/*', '*://site.web.api.espn.com/*'];

const keyFor = (url: string) => createHash('sha1').update(url).digest('hex');

const download = async (url: string): Promise<{ meta: CachedResponse; body: Buffer }> => {
	try {
		const response = await fetch(url, { headers: { 'User-Agent': 'ArenaSwapFilm/1.0 (https://github.com/hiteacheryouare/arenaswap)' } });
		return {
			meta: { status: response.status, contentType: response.headers.get('content-type') ?? 'application/octet-stream' },
			body: Buffer.from(await response.arrayBuffer()),
		};
	} catch {
		return { meta: { status: 504, contentType: 'text/plain' }, body: Buffer.alloc(0) };
	}
};

export interface NetCacheStats {
	hits: number;
	downloads: number;
	misses: string[];
}

const attachNetCache = async (cdp: CdpConnection, cacheDir: string, offline: boolean): Promise<NetCacheStats> => {
	mkdirSync(cacheDir, { recursive: true });
	const stats: NetCacheStats = { hits: 0, downloads: 0, misses: [] };

	cdp.on('Fetch.requestPaused', async ({ requestId, request }: { requestId: string; request: { url: string } }) => {
		const key = keyFor(request.url);
		const metaFile = join(cacheDir, `${key}.json`);
		const bodyFile = join(cacheDir, `${key}.bin`);
		let meta: CachedResponse;
		let body: Buffer;

		if (existsSync(metaFile)) {
			meta = JSON.parse(readFileSync(metaFile, 'utf8')) as CachedResponse;
			body = readFileSync(bodyFile);
			stats.hits++;
		} else if (offline) {
			stats.misses.push(request.url);
			meta = { status: 404, contentType: 'text/plain' };
			body = Buffer.alloc(0);
		} else {
			({ meta, body } = await download(request.url));
			if (meta.status !== 504) {
				writeFileSync(bodyFile, body);
				writeFileSync(metaFile, JSON.stringify({ url: request.url, ...meta }));
			}
			stats.downloads++;
		}

		await cdp.send('Fetch.fulfillRequest', {
			requestId,
			responseCode: meta.status,
			responseHeaders: [
				{ name: 'Content-Type', value: meta.contentType },
				{ name: 'Access-Control-Allow-Origin', value: '*' },
				{ name: 'Cache-Control', value: 'max-age=31536000' },
			],
			body: body.toString('base64'),
		}).catch(() => {});
	});

	await cdp.send('Fetch.enable', { patterns: remoteHosts.map(urlPattern => ({ urlPattern, requestStage: 'Request' })) });
	return stats;
};

export default attachNetCache;
