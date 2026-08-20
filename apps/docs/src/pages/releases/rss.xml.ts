import { getCollection } from 'astro:content';
import type { APIRoute } from 'astro';

// Hand-rolled rather than pulling in @astrojs/rss for one endpoint. The feed carries the summary
// only, not the body: an item that changes shape every time a release note is edited is worse for
// a reader than a stable pointer at the page.

const escape = (value: string): string => (
	value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
);

export const GET: APIRoute = async ({ site }) => {
	const base = import.meta.env.BASE_URL;
	const origin = site ?? new URL('https://hiteacheryouare.github.io');
	const feedUrl = new URL(`${base}releases/rss.xml`, origin).href;
	const indexUrl = new URL(`${base}releases/`, origin).href;

	const releases = (await getCollection('releases', ({ data }) => !data.draft))
		.toSorted((a, b) => b.data.date.valueOf() - a.data.date.valueOf());

	const items = releases.map(release => {
		const link = new URL(`${base}releases/${release.data.version}/`, origin).href;
		return [
			'\t\t<item>',
			`\t\t\t<title>${escape(`${release.data.version} — ${release.data.title}`)}</title>`,
			`\t\t\t<link>${escape(link)}</link>`,
			`\t\t\t<guid isPermaLink="true">${escape(link)}</guid>`,
			`\t\t\t<pubDate>${release.data.date.toUTCString()}</pubDate>`,
			`\t\t\t<description>${escape(release.data.summary)}</description>`,
			'\t\t</item>',
		].join('\n');
	});

	const xml = [
		'<?xml version="1.0" encoding="UTF-8"?>',
		'<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
		'\t<channel>',
		'\t\t<title>ArenaSwap release notes</title>',
		`\t\t<link>${escape(indexUrl)}</link>`,
		`\t\t<atom:link href="${escape(feedUrl)}" rel="self" type="application/rss+xml" />`,
		'\t\t<description>What shipped in each version of ArenaSwap.</description>',
		'\t\t<language>en</language>',
		...items,
		'\t</channel>',
		'</rss>',
		'',
	].join('\n');

	return new Response(xml, {
		headers: { 'Content-Type': 'application/xml; charset=utf-8' },
	});
};
