import Menu from 'bootstrap/js/dist/menu.js';
import { shift } from '@floating-ui/dom';
import type { Middleware } from '@floating-ui/dom';
import type { MenuConfig } from 'bootstrap/js/dist/menu.js';

// The popup's own side margin. Bootstrap shifts an open menu back inside the window but lets it
// touch the edge, so a wide list on a right-hand card ends up flush with the window.
const popupMarginPx = 12;

const keepPopupMargin = (defaultConfig: Record<string, any>) => ({
	middleware: (defaultConfig.middleware as Middleware[]).map(middleware => (
		middleware.name === 'shift' ? shift({ boundary: 'clippingAncestors', padding: popupMarginPx }) : middleware
	)),
});

const attachMenu = (toggle: HTMLElement, config?: Partial<MenuConfig>) => {
	const menu = Menu.getOrCreateInstance(toggle, { floatingConfig: keepPopupMargin, ...config });
	return () => menu.dispose();
};

export default attachMenu;
