import { readdirSync, readFileSync } from 'node:fs';
import { join, posix, relative, sep } from 'node:path';

// Reads the finished `astro build` output the same way GitHub Pages will. A spec could ask the
// static server for all 361 pages one at a time, but the artifact is the product and the server is
// a fixture — walking the directory measures what gets published, and does it in under a second
// rather than in a few hundred round trips.

// The nine store-asset pages are rendered to be screenshotted rather than visited: they carry
// noindex, they are filtered out of the sitemap, and they are not part of the twelve-locale tree.
const screenshotDir = 'screenshots';

// Astro writes a retired URL as a meta-refresh stub with no <html lang> and no chrome. They are
// pages in the filesystem sense only.
const isRedirectStub = (html: string) => /<meta http-equiv="refresh"/i.test(html);

export interface SiteReport {
	basePath: string;
	pagePaths: string[];
	brokenLinks: { target: string; from: string[] }[];
	langMismatches: { page: string; found: string | null; expected: string }[];
	leakedKeys: { page: string; text: string }[];
	sitemapMissing: string[];
	sitemapUnreachable: string[];
	localeGaps: { locale: string; missing: string[]; extra: string[] }[];
}

const walk = (dir: string): string[] =>
	readdirSync(dir, { withFileTypes: true }).flatMap(entry =>
		entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)],
	);

// A text node that is nothing but dotted lowerCamel segments is almost certainly a translation key
// that came back missing. `islandTranslator` renders the key rather than throwing, on purpose — an
// island that failed to hydrate would take a whole demo down over one label — so the page ships
// with `main.sectionActiveLiveTabs` where a heading should be and nothing anywhere says so.
const keyShaped = /^[a-z][a-zA-Z0-9]*(\.[a-zA-Z][a-zA-Z0-9]*)+$/;

// Hostnames and file names read as keys and are not. Anything with a known suffix is skipped.
const notAKey = /\.(com|net|org|io|tv|dev|gg|co|uk|br|pt|cn|tw|jp|kr|mx|de|fr|it|ph|es|png|svg|jpg|webp|mp4|xml|json|js|ts|tsx|css|scss|md)$/i;

// The PowerScore reference documents an object whose properties are dotted paths, so its code
// samples are full of text this heuristic would otherwise read as a leaked key. Code is never a
// translated string, so it comes out before the scan.
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

	// `faq/index.html` in the German tree and in the English tree are the same page in two
	// languages, so the locale segment comes off before the two sets are compared.
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

	for (const page of pages) {
		const html = readFileSync(join(siteDir, page.split('/').join(sep)), 'utf8');

		for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
			const target = match[1] ?? '';
			if (!target.startsWith(basePath)) continue;
			if (resolves(target)) continue;
			if (!brokenTargets.has(target)) brokenTargets.set(target, new Set());
			brokenTargets.get(target)?.add(page);
		}

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
		inSitemapNeeded.push(page);
	}

	const sitemap = readFileSync(join(siteDir, 'sitemap-0.xml'), 'utf8');
	const sitemapPaths = new Set(
		[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)]
			.map(match => new URL(match[1] ?? '').pathname)
			.map(pathname => (pathname.endsWith('/') ? `${pathname.slice(basePath.length)}index.html` : pathname.slice(basePath.length))),
	);

	const sitemapMissing = inSitemapNeeded.filter(page => !sitemapPaths.has(page));
	const sitemapUnreachable = [...sitemapPaths].filter(page => !files.has(page));

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
		localeGaps,
	};
};
