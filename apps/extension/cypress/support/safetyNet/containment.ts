// No Cypress in this file: the docs site's crawler runs the same check against every page. That
// runs in another frame than the page, so nodes are told apart by nodeType rather than instanceof,
// and styles are read through the page's own window.

export interface containmentOptions {
	// Selectors for elements left out of the check, along with everything inside them.
	exempt?: readonly string[];
	// Selectors for elements designed to reach into the padding of the box that clips them, such as
	// the popup header's -0.75rem margins. They and everything inside them may use that padding, but
	// still may not run past the clipping box itself.
	bleeds?: readonly string[];
	// Selectors for boxes meant to scroll sideways. A box whose overflow is auto or scroll on both
	// axes reads the same in computed style as one meant to scroll only up and down, so it counts as
	// a sideways scroller only when it is listed here.
	scrollers?: readonly string[];
	// Subpixel slack, in CSS pixels.
	tolerance?: number;
}

export type containmentRule = 'escapes' | 'cutWithoutFullText' | 'rootScrollsSideways';

export interface containmentViolation {
	rule: containmentRule;
	node: Node;
	message: string;
}

interface boundary {
	kind: 'clip' | 'scroller';
	element: Element;
}

interface span {
	left: number;
	right: number;
}

const defaultTolerance = 0.5;

const isElement = (node: Node): node is Element => node.nodeType === Node.ELEMENT_NODE;
const styleOf = (element: Element) => element.ownerDocument.defaultView!.getComputedStyle(element);

const normalize = (text: string | null | undefined) => (text ?? '').replace(/\s+/g, ' ').trim();

export const describeElement = (element: Element) => {
	const id = element.id ? `#${element.id}` : '';
	const classes = Array.from(element.classList).slice(0, 3).map(name => `.${name}`).join('');
	const text = normalize(element.textContent).slice(0, 40);
	return `${element.tagName.toLowerCase()}${id}${classes}${text ? ` "${text}"` : ''}`;
};

const isTransformish = (style: CSSStyleDeclaration) => style.transform !== 'none'
	|| style.filter !== 'none'
	|| style.perspective !== 'none'
	|| /paint|layout|strict|content/.test(style.contain)
	|| style.willChange.includes('transform');

const clipsSideways = (style: CSSStyleDeclaration) => style.overflowX === 'hidden' || style.overflowX === 'clip';
const scrollsSideways = (style: CSSStyleDeclaration) => style.overflowX === 'auto' || style.overflowX === 'scroll';

// Masked on purpose: screen-reader-only text and anything shaped with clip-path.
const isMasked = (style: CSSStyleDeclaration) => style.clipPath !== 'none' || style.clip === 'rect(0px, 0px, 0px, 0px)';

const matchesAny = (element: Element, selectors: readonly string[]) => selectors.some(selector => element.matches(selector));

// The first ancestor that actually clips `start`, honouring the CSS rule that an absolutely
// positioned box escapes the overflow of every static ancestor below its containing block, and a
// fixed one escapes all of them.
const findBoundary = (start: Element | null, position: string, root: Element, scrollers: readonly string[]): boundary | null => {
	let mode = position === 'absolute' || position === 'fixed' ? position : 'static';
	for (let ancestor = start; ancestor && ancestor !== root; ancestor = ancestor.parentElement) {
		const style = styleOf(ancestor);
		const contains = mode === 'fixed'
			? isTransformish(style)
			: mode === 'absolute' ? style.position !== 'static' || isTransformish(style) : true;
		if (!contains) continue;
		if (scrollsSideways(style)) {
			const sidewaysOnly = style.overflowY === 'hidden' || style.overflowY === 'clip';
			return { kind: sidewaysOnly || matchesAny(ancestor, scrollers) ? 'scroller' : 'clip', element: ancestor };
		}
		if (clipsSideways(style)) return { kind: 'clip', element: ancestor };
		mode = style.position === 'absolute' || style.position === 'fixed' ? style.position : 'static';
	}
	return null;
};

// The padding box, minus any vertical scrollbar: the part of a box its content can be seen in.
const paddingSpan = (element: Element): span => {
	const rect = element.getBoundingClientRect();
	const left = rect.left + element.clientLeft;
	return { left, right: left + element.clientWidth };
};

// Where a clipping box means its content to stop. Text that reaches into the padding sits under
// whatever the padding was making room for (a select's caret, the popup's margins) or is cut there.
const contentSpan = (element: Element): span => {
	const outer = paddingSpan(element);
	const style = styleOf(element);
	return { left: outer.left + parseFloat(style.paddingLeft), right: outer.right - parseFloat(style.paddingRight) };
};

const rectsOf = (node: Node): DOMRect[] => {
	if (isElement(node)) return [node.getBoundingClientRect()];
	const range = node.ownerDocument!.createRange();
	range.selectNodeContents(node);
	return Array.from(range.getClientRects());
};

// An ellipsis only ever cuts inline content. Inside a flex or grid container the children are
// blocks, so `text-overflow` does nothing and they are clipped bare, which the escape check reports.
const lineBoxDisplay = (style: CSSStyleDeclaration) => !/flex|grid/.test(style.display);

const isTruncated = (element: Element, style: CSSStyleDeclaration) => {
	const ellipsis = style.textOverflow === 'ellipsis' && style.overflowX !== 'visible' && lineBoxDisplay(style) && element.scrollWidth > element.clientWidth;
	const lineClamp = style.getPropertyValue('-webkit-line-clamp');
	const clamped = lineClamp !== '' && lineClamp !== 'none' && element.scrollHeight > element.clientHeight;
	return ellipsis || clamped;
};

// The convention since 0394b1557: wherever text is cut short, the element or one around it carries
// the whole text as its title.
const exposesFullText = (element: Element) => {
	const text = normalize(element.textContent);
	const titled = element.closest('[title]');
	return text === '' || (titled !== null && normalize(titled.getAttribute('title')).includes(text));
};

export const findContainmentViolations = (root: Element, options: containmentOptions = {}): containmentViolation[] => {
	const exempt = options.exempt ?? [];
	const bleeds = options.bleeds ?? [];
	const scrollers = options.scrollers ?? [];
	const tolerance = options.tolerance ?? defaultTolerance;
	const violations: containmentViolation[] = [];
	const rootSpan = paddingSpan(root);
	const rootName = `the surface root ${describeElement(root)}`;

	if (root.scrollWidth > root.clientWidth) {
		violations.push({
			rule: 'rootScrollsSideways',
			node: root,
			message: `${describeElement(root)} is ${root.scrollWidth}px wide inside ${root.clientWidth}px, so it scrolls sideways`,
		});
	}

	const checkEscape = (node: Node, position: string, inBleed: boolean): boolean => {
		const found = findBoundary(node.parentElement, position, root, scrollers);
		if (found?.kind === 'scroller') return false;
		const bound = !found ? rootSpan : inBleed ? paddingSpan(found.element) : contentSpan(found.element);
		const boundName = !found ? rootName : `${inBleed ? 'the edge' : 'the content edge'} of ${describeElement(found.element)}`;
		for (const rect of rectsOf(node)) {
			if (rect.width === 0) continue;
			const overLeft = bound.left - rect.left;
			const overRight = rect.right - bound.right;
			if (overLeft > tolerance || overRight > tolerance) {
				const what = isElement(node) ? describeElement(node) : `text "${normalize(node.textContent).slice(0, 40)}"`;
				const side = overRight > tolerance ? `${overRight.toFixed(1)}px past the right of` : `${overLeft.toFixed(1)}px past the left of`;
				violations.push({ rule: 'escapes', node, message: `${what} runs ${side} ${boundName}` });
				return true;
			}
		}
		return false;
	};

	const visit = (element: Element, inBleed: boolean) => {
		for (const child of Array.from(element.childNodes)) {
			if (child.nodeType === Node.TEXT_NODE) {
				if (normalize(child.textContent) !== '') checkEscape(child, 'static', inBleed);
				continue;
			}
			if (!isElement(child)) continue;
			if (matchesAny(child, exempt)) continue;
			if (child.getClientRects().length === 0) continue;
			const style = styleOf(child);
			if (style.visibility === 'hidden' || isMasked(style)) continue;
			const childBleeds = inBleed || matchesAny(child, bleeds);
			if (checkEscape(child, style.position, childBleeds)) continue;
			if (isTruncated(child, style)) {
				if (!exposesFullText(child)) {
					violations.push({
						rule: 'cutWithoutFullText',
						node: child,
						message: `${describeElement(child)} is cut short and neither it nor anything around it carries the full text as a title`,
					});
				}
				continue;
			}
			if (child.namespaceURI === 'http://www.w3.org/2000/svg') continue;
			visit(child, childBleeds);
		}
	};

	visit(root, false);
	return violations;
};

// Measuring before a webfont lands measures the fallback, which is narrower. `document.fonts.check()`
// reports true here even when nothing has loaded, so every face the surface uses is loaded outright,
// with the surface's own text so every unicode-range subset it needs comes with it.
export const loadFontsUsedIn = (root: Element): Promise<unknown> => {
	const samples = new Map<string, string>();
	const elements = [root, ...Array.from(root.querySelectorAll('*'))];
	for (const element of elements) {
		const text = Array.from(element.childNodes).filter(node => node.nodeType === Node.TEXT_NODE).map(node => node.textContent ?? '').join('');
		if (normalize(text) === '') continue;
		const style = styleOf(element);
		const font = `${style.fontStyle} ${style.fontWeight} 16px ${style.fontFamily}`;
		samples.set(font, `${samples.get(font) ?? ''}${text}`.slice(0, 400));
	}
	const fonts = root.ownerDocument.fonts;
	return Promise.all(Array.from(samples, ([font, text]) => fonts.load(font, text)));
};
