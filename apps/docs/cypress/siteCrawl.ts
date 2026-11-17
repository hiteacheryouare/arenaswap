import { readdirSync, readFileSync } from 'node:fs';
import { join, posix, relative, sep } from 'node:path';

const screenshotDir = 'screenshots';

const isRedirectStub = (html: string) => /<meta http-equiv="refresh"/i.test(html);

export interface SiteReport {
	basePath: string;
	pagePaths: string[];
	brokenLinks: { target: string; from: string[] }[];
	langMismatches: { page: string; found: string | null; expected: string }[];
	leakedKeys: { page: string; text: string }[];
	sitemapMissing: string[];
	sitemapUnreachable: string[];
	sitemapNotCanonical: string[];
	localeGaps: { locale: string; missing: string[]; extra: string[] }[];
}

const walk = (dir: string): string[] =>
	readdirSync(dir, { withFileTypes: true }).flatMap(entry =>
		entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)],
	);

const keyShaped = /^[a-z][a-zA-Z0-9]*(\.[a-zA-Z][a-zA-Z0-9]*)+$/;

const notAKey = /\.(com|net|org|io|tv|dev|gg|co|uk|br|pt|cn|tw|jp|kr|mx|de|fr|it|ph|es|png|svg|jpg|webp|mp4|xml|json|js|ts|tsx|css|scss|md)$/i;

const withoutCode = (html: string) => html
	.replace(/<pre[\s\S]*?<\/pre>/g, '')
	.replace(/<code[\s\S]*?<\/code>/g, '');

export const crawlSite = (siteDir: string, basePath: string, localeCodes: string[]): SiteReport => {
	const toUrlPath = (file: string) => posix.join(...relative(siteDir, file).split(sep));
	const files = new Set(walk(siteDir).map(toUrlPath));
	const pages = [...files].filter(file => file.endsWith('.html')).toSorted();

	const localeOf = (page: string) => {
		const first = page.split('/')[0] ?? '';
		return localeCodes.includes(first) && first !== 'en' ? first : 'en';
	};

	const pagePathOf = (page: string) => {
		const locale = localeOf(page);
		return locale === 'en' ? page : page.slice(locale.length + 1);
	};

	const resolves = (url: string) => {
		const withoutBase = url.slice(basePath.length).split('#')[0]?.split('?')[0] ?? '';
		if (withoutBase === '') return files.has('index.html');
		return files.has(withoutBase) || files.has(posix.join(withoutBase, 'index.html'));
	};

	const brokenTargets = new Map<string, Set<string>>();
	const langMismatches: SiteReport['langMismatches'] = [];
	const leakedKeys: SiteReport['leakedKeys'] = [];
	const inSitemapNeeded: string[] = [];
	const canonicalOf = new Map<string, string | null>();

	const urlToPage = (url: string) => {
		const pathname = new URL(url).pathname;
		return pathname.endsWith('/') ? `${pathname.slice(basePath.length)}index.html` : pathname.slice(basePath.length);
	};

	for (const page of pages) {
		const html = readFileSync(join(siteDir, page.split('/').join(sep)), 'utf8');

		for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
			const target = match[1] ?? '';
			if (!target.startsWith(basePath)) continue;
			if (resolves(target)) continue;
			if (!brokenTargets.has(target)) brokenTargets.set(target, new Set());
			brokenTargets.get(target)?.add(page);
		}

		const canonicalHref = html.match(/<link[^>]*rel="canonical"[^>]*>/)?.[0].match(/href="([^"]+)"/)?.[1];
		canonicalOf.set(page, canonicalHref ? urlToPage(canonicalHref) : null);

		if (isRedirectStub(html)) continue;

		const lang = html.match(/<html lang="([^"]*)"/)?.[1] ?? null;
		const expected = localeOf(page);
		if (lang !== expected) langMismatches.push({ page, found: lang, expected });

		for (const match of withoutCode(html).matchAll(/>([^<>{}]{2,60})</g)) {
			const text = (match[1] ?? '').trim();
			if (!keyShaped.test(text) || notAKey.test(text)) continue;
			leakedKeys.push({ page, text });
		}

		if (page === '404.html') continue;
		if (page.split('/')[0] === screenshotDir) continue;
		if (canonicalOf.get(page) === page) inSitemapNeeded.push(page);
	}

	const sitemap = readFileSync(join(siteDir, 'sitemap-0.xml'), 'utf8');
	const sitemapPaths = new Set(
		[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)]
			.map(match => urlToPage(match[1] ?? '')),
	);

	const sitemapMissing = inSitemapNeeded.filter(page => !sitemapPaths.has(page));
	const sitemapUnreachable = [...sitemapPaths].filter(page => !files.has(page));
	const sitemapNotCanonical = [...sitemapPaths].filter(page => files.has(page) && canonicalOf.get(page) !== page);

	const englishPaths = new Set(pages.filter(page => localeOf(page) === 'en').map(pagePathOf).filter(page =>
		page.split('/')[0] !== screenshotDir && page !== '404.html' && !isRedirectStub(readFileSync(join(siteDir, page.split('/').join(sep)), 'utf8')),
	));

	const localeGaps = localeCodes
		.filter(code => code !== 'en')
		.map(locale => {
			const theirs = new Set(pages.filter(page => localeOf(page) === locale).map(pagePathOf));
			return {
				locale,
				missing: [...englishPaths].filter(page => !theirs.has(page)),
				extra: [...theirs].filter(page => !englishPaths.has(page)),
			};
		})
		.filter(gap => gap.missing.length > 0 || gap.extra.length > 0);

	return {
		basePath,
		pagePaths: pages,
		brokenLinks: [...brokenTargets].map(([target, from]) => ({ target, from: [...from] })),
		langMismatches,
		leakedKeys,
		sitemapMissing,
		sitemapUnreachable,
		sitemapNotCanonical,
		localeGaps,
	};
};
