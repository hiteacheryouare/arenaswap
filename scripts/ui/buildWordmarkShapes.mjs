// Regenerates `packages/ui/src/components/wordmarkShapes.ts` from the two SVGs the popup header
// animates between. Run with `npm run ui:wordmark-shapes` after either file changes.
//
// Most of the mark needs nothing from this: the icon's `a` and `s` are the wordmark's own outlines
// at 0.3453x, so those ship as one path and a transform, and the bar and the dashed tail are
// redrawn as strokes. The two arrows are the exception. The icon draws a wider head and a lighter
// chevron, which no transform will reach, so each is emitted as a pair of point rings: the same
// contour from both files, resampled to the same count at the same arc-length spacing and rotated
// into correspondence, so lerping index by index walks one outline onto the other.
//
// The alignment search runs in unit space so the two sizes cannot skew it, and the result is then
// applied to the ring in its own coordinates.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../..');
const wordmarkFile = path.join(repo, 'apps/docs/src/assets/full_logo_white_on_transparent.svg');
const iconFile = path.join(repo, 'apps/docs/src/assets/icon_white_on_transparent.svg');
const outFile = path.join(repo, 'packages/ui/src/components/wordmarkShapes.ts');

const parse = (file) => {
	const svg = readFileSync(file, 'utf8');
	const d = svg.match(/ d="([^"]+)"/)[1];
	const tok = d.match(/[a-zA-Z]|-?\d*\.?\d+(?:e-?\d+)?/g);
	const cmds = []; let i = 0, cur = null;
	while (i < tok.length) {
		if (/[a-zA-Z]/.test(tok[i])) { cur = tok[i]; i++; }
		const argc = { m:2,l:2,h:1,v:1,c:6,z:0 }[cur.toLowerCase()];
		const a = []; for (let k = 0; k < argc; k++) a.push(parseFloat(tok[i++]));
		cmds.push([cur, a]); if (cur === 'm') cur = 'l'; if (cur === 'M') cur = 'L';
	}
	const subs = []; let s = null;
	for (const c of cmds) { if (c[0] === 'M' || c[0] === 'm') { s = []; subs.push(s); } s.push(c); }
	let x = 0, y = 0;
	for (const sub of subs) {
		const [c, a] = sub[0];
		if (c === 'm') { x += a[0]; y += a[1]; } else { x = a[0]; y = a[1]; }
		sub[0] = ['M', [x, y]];
		let cx = x, cy = y; const sx = x, sy = y;
		for (let k = 1; k < sub.length; k++) {
			const [cc, aa] = sub[k]; const rel = cc === cc.toLowerCase();
			if (cc === 'z' || cc === 'Z') { cx = sx; cy = sy; }
			else if (cc === 'H' || cc === 'h') cx = rel ? cx + aa[0] : aa[0];
			else if (cc === 'V' || cc === 'v') cy = rel ? cy + aa[0] : aa[0];
			else if (cc === 'L' || cc === 'l') { cx = rel ? cx + aa[0] : aa[0]; cy = rel ? cy + aa[1] : aa[1]; }
			else if (cc === 'C' || cc === 'c') { cx = rel ? cx + aa[4] : aa[4]; cy = rel ? cy + aa[5] : aa[5]; }
		}
		x = cx; y = cy;
	}
	return subs;
};

const flatten = (sub, per = 48) => {
	const pts = []; let x = 0, y = 0, sx = 0, sy = 0;
	for (const [c, a] of sub) {
		const rel = c === c.toLowerCase();
		if (c === 'M') { x = a[0]; y = a[1]; sx = x; sy = y; pts.push([x, y]); continue; }
		if (c === 'z' || c === 'Z') { x = sx; y = sy; continue; }
		if (c === 'H' || c === 'h') { x = rel ? x + a[0] : a[0]; pts.push([x, y]); continue; }
		if (c === 'V' || c === 'v') { y = rel ? y + a[0] : a[0]; pts.push([x, y]); continue; }
		if (c === 'L' || c === 'l') { x = rel ? x + a[0] : a[0]; y = rel ? y + a[1] : a[1]; pts.push([x, y]); continue; }
		const p0x = x, p0y = y;
		const p1x = rel ? x + a[0] : a[0], p1y = rel ? y + a[1] : a[1];
		const p2x = rel ? x + a[2] : a[2], p2y = rel ? y + a[3] : a[3];
		const p3x = rel ? x + a[4] : a[4], p3y = rel ? y + a[5] : a[5];
		for (let k = 1; k <= per; k++) {
			const t = k / per, u = 1 - t;
			pts.push([u*u*u*p0x + 3*u*u*t*p1x + 3*u*t*t*p2x + t*t*t*p3x,
			          u*u*u*p0y + 3*u*u*t*p1y + 3*u*t*t*p2y + t*t*t*p3y]);
		}
		x = p3x; y = p3y;
	}
	return pts;
};

const bboxOf = (pts) => {
	let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
	for (const [x, y] of pts) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
	return { minX, maxX, minY, maxY, w: maxX - minX, h: maxY - minY };
};

// resample a closed ring to N points spaced evenly by arc length
const resample = (pts, n) => {
	const ring = pts.slice();
	if (ring[0][0] !== ring[ring.length-1][0] || ring[0][1] !== ring[ring.length-1][1]) ring.push(ring[0]);
	const seg = [0];
	for (let i = 1; i < ring.length; i++) seg.push(seg[i-1] + Math.hypot(ring[i][0]-ring[i-1][0], ring[i][1]-ring[i-1][1]));
	const total = seg[seg.length-1];
	const out = []; let j = 0;
	for (let k = 0; k < n; k++) {
		const target = (total * k) / n;
		while (j < seg.length - 2 && seg[j+1] < target) j++;
		const span = seg[j+1] - seg[j] || 1;
		const f = (target - seg[j]) / span;
		out.push([ring[j][0] + (ring[j+1][0]-ring[j][0])*f, ring[j][1] + (ring[j+1][1]-ring[j][1])*f]);
	}
	return out;
};

// normalise a ring into a unit box so two shapes can be matched regardless of size
const unitise = (ring, box) => ring.map(([x, y]) => [(x - box.minX) / box.w, (y - box.minY) / box.h]);

// rotate/reverse ring B so it lines up with ring A
const align = (a, b) => {
	let best = null;
	for (const rev of [false, true]) {
		const cand = rev ? [b[0], ...b.slice(1).reverse()] : b;
		for (let r = 0; r < cand.length; r++) {
			let sum = 0;
			for (let i = 0; i < a.length; i++) {
				const p = cand[(i + r) % cand.length];
				sum += (a[i][0]-p[0])**2 + (a[i][1]-p[1])**2;
			}
			if (!best || sum < best.sum) best = { sum, rev, r };
		}
	}
	return { score: best.sum / a.length, rev: best.rev, rot: best.r };
};

// The alignment is searched in unit space so the two sizes cannot skew it, then applied to the ring
// in its own coordinates. Returning the unit-space ring instead is a mistake that reads as the
// shape simply not being there at the far end of the morph.
const reorder = (ring, { rev, rot }) => {
	const cand = rev ? [ring[0], ...ring.slice(1).reverse()] : ring;
	return cand.map((_, i) => cand[(i + rot) % cand.length]);
};

const W = parse(wordmarkFile);
const I = parse(iconFile);

// split each arrow into bar + head at its joint
const cutHead = (sub, jointCmdIndex, jointX, jointY) => [['M', [jointX, jointY]], ...sub.slice(jointCmdIndex + 1)];
const wHeadIdx = W[6].findIndex(([c, a]) => c === 'h' && a.length === 1 && a[0] === 599);
const wHead = cutHead(W[6], wHeadIdx, 1691, 130);
// The icon draws its arrow in the other direction, so its head is not one contiguous run. The
// contour starts at the head's bottom-back, comes up to the joint at (1380, 875), goes left along
// the bar and back, reaches the top of the joint at (1380, 793) at index 9, then draws the head.
// Taking only what follows index 9 leaves off the wedge between (1407, 995) and (1380, 875), which
// is a visible bite out of the underside of the arrowhead.
const iHead = [['M', [1380, 793]], ...I[6].slice(10, 20), ...I[6].slice(1, 4), ['z', []]];

const shapes = {
	chevron: { w: W[13], i: I[1] },
	head:    { w: wHead,  i: iHead },
};

const N = 168;
const out = {};
for (const [name, { w, i }] of Object.entries(shapes)) {
	const wp = flatten(w), ip = flatten(i);
	const wb = bboxOf(wp), ib = bboxOf(ip);
	const wr = resample(wp, N), ir = resample(ip, N);
	const how = align(unitise(wr, wb), unitise(ir, ib));
	const { score, rev, rot } = how;
	out[name] = { wb, ib, wr, ir: reorder(ir, how) };
	console.log(`${name}: wordmark ${wb.w.toFixed(1)}x${wb.h.toFixed(1)}  icon ${ib.w.toFixed(1)}x${ib.h.toFixed(1)}  match-score ${score.toFixed(5)} (rev=${rev} rot=${rot})`);
}

// every piece's box, in its own file's units
const box = (subs, idx) => bboxOf(idx.flatMap(k => flatten(subs[k])));
const report = {
	wordmark: {
		aren: box(W, [0,7,1,2,5,3]), a: box(W, [4,8]), s: box(W, [9]), wap: box(W, [12,10,22,11,14]),
		chevron: box(W, [13]), head: bboxOf(flatten(wHead)),
	},
	icon: { a: box(I, [4,5]), s: box(I, [0]), chevron: box(I, [1]), head: bboxOf(flatten(iHead)),
	        dash1: box(I, [2]), dash2: box(I, [3]) },
};
for (const [file, pieces] of Object.entries(report)) {
	console.log(`--- ${file} ---`);
	for (const [k, b] of Object.entries(pieces)) console.log(`  ${k.padEnd(8)} x ${b.minX.toFixed(2)}..${b.maxX.toFixed(2)}  y ${b.minY.toFixed(2)}..${b.maxY.toFixed(2)}  ${b.w.toFixed(2)}x${b.h.toFixed(2)}`);
}
console.log('letter scale a:', (report.wordmark.a.h / report.icon.a.h).toFixed(6), ' s:', (report.wordmark.s.h / report.icon.s.h).toFixed(6));

// ─── emit the shape module ───────────────────────────────────────────────────────────────────
const k = (report.wordmark.a.h / report.icon.a.h + report.wordmark.s.h / report.icon.s.h) / 2;
const ox = report.icon.chevron.minX * k;
const oy = report.icon.a.minY * k;
const toShared = ([x, y]) => [x * k - ox, y * k - oy];
const num = (v) => String(Math.round(v * 100) / 100);
const ringOf = (pts) => pts.flat().map(num).join(',');

const ser = (sub) => sub.map(([c, a]) => c + a.map(num).join(',')).join('');
const group = (subs, idx) => idx.map(n => ser(subs[n])).join('');

const L = [];
L.push('// Generated from `full_logo_white_on_transparent.svg` and `icon_white_on_transparent.svg`.');
L.push('// Run `npm run ui:wordmark-shapes` to rebuild it; do not edit any of this by hand.');
L.push('//');
L.push('// The two marks share their letterforms — the icon\'s `a` and `s` are the wordmark\'s own');
L.push('// outlines at 0.3453x — so those travel as one path under a transform. Their arrows do not:');
L.push('// the icon draws a wider head and a lighter chevron, which is why those two are stored as');
L.push('// matched point rings instead. Each pair is the same contour resampled to the same count at');
L.push('// the same arc-length spacing and rotated into correspondence, so lerping index by index');
L.push('// walks one outline onto the other. At 0 the ring is the wordmark\'s shape and at 1 it is the');
L.push('// icon\'s, both to well under a tenth of a pixel at the size this renders.');
L.push('//');
L.push('// Everything is in the wordmark\'s own viewBox units. Icon coordinates were mapped in by the');
L.push('// ratio of the two files\' letter heights, then shifted so the icon\'s chevron and ascender');
L.push('// land on the origin.');
L.push('');
for (const [name, idx] of Object.entries({ aren: [0,7,1,2,5,3], a: [4,8], s: [9], wap: [12,10,22,11,14] })) {
	L.push(`export const ${name}Path = '${group(W, idx)}';`);
	L.push('');
}
for (const [name, { wr, ir }] of Object.entries(out)) {
	L.push(`export const ${name}From = [${ringOf(wr)}];`);
	L.push('');
	L.push(`export const ${name}To = [${ringOf(ir.map(toShared))}];`);
	L.push('');
}
L.push('export const ringPoints = ' + N + ';');
L.push('');
writeFileSync(outFile, L.join('\r\n'));
console.log('\nwrote wordmarkShapes.ts');
console.log('letter scale k =', k.toFixed(6), ' offset', ox.toFixed(2), oy.toFixed(2));
const icon = report.icon;
const dot = { cx: 1772.8514, cy: 1379.8828, rx: 53.381836, ry: 50.256832, sw: 1.13738 };
const t = (v, o) => v * k - o;
console.log('TARGETS (wordmark units):');
console.log('  a      ', t(icon.a.minX, ox).toFixed(2), t(icon.a.minY, oy).toFixed(2), 'size', (icon.a.w*k).toFixed(2), (icon.a.h*k).toFixed(2));
console.log('  s      ', t(icon.s.minX, ox).toFixed(2), t(icon.s.minY, oy).toFixed(2), 'size', (icon.s.w*k).toFixed(2), (icon.s.h*k).toFixed(2));
console.log('  dot    cx', t(dot.cx, ox).toFixed(2), 'cy', t(dot.cy, oy).toFixed(2), 'rx', (dot.rx*k).toFixed(3), 'ry', (dot.ry*k).toFixed(3), 'sw', (dot.sw*k).toFixed(3));
console.log('  bar    left', t(937.4, ox).toFixed(2), 'joint', t(1380, ox).toFixed(2), 'centreY', t((793+875)/2, oy).toFixed(2), 'stroke', ((875-793)*k).toFixed(2));
const d1 = icon.dash1, d2 = icon.dash2, r = d1.h/2;
console.log('  dashes firstCap', t(d1.minX + r, ox).toFixed(2), 'lastCap', t(d2.maxX - r, ox).toFixed(2),
            'centreY', t((d1.minY+d1.maxY)/2, oy).toFixed(2), 'stroke', (d1.h*k).toFixed(2),
            'seg', ((d1.w - d1.h)*k).toFixed(2), 'gap', (((d2.minX-d1.minX) - (d1.w - d1.h) - d1.h)*k).toFixed(2));
// The icon file carries an orange period the shipped icon does not: every PNG under
// `apps/extension/public/icon` has zero orange pixels, and their white ink measures 1.212 wide for
// its height against this box's 1.218 and the with-the-dot box's 1.414. The mark ends at the
// arrowhead, so the dot is animated away rather than parked.
const boxW = icon.head.maxX * k - ox, boxH = icon.s.maxY * k - oy;
console.log('  collapsed box (no dot)', boxW.toFixed(2), 'x', boxH.toFixed(2), ' aspect', (boxW/boxH).toFixed(4));
console.log('  dot would have reached cx', (dot.cx * k - ox).toFixed(2), 'cy', (dot.cy * k - oy).toFixed(2));
