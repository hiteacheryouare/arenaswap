import Menu from 'bootstrap/js/dist/menu.js';
import EventHandler from 'bootstrap/js/dist/dom/event-handler.js';
import { shift } from '@floating-ui/dom';
import type { Middleware } from '@floating-ui/dom';
import type { MenuConfig } from 'bootstrap/js/dist/menu.js';

// Bootstrap 6.0.0-alpha.1's Menu.dispose() leaves the submenu handlers it put on the menu itself in
// its module-wide event registry, and that registry then holds every unmounted menu, and the card
// around it, for the life of the popup.
const submenuEvents = ['mouseenter', 'mouseleave', 'mousemove', 'click'];

// The popup's own side margin. Bootstrap shifts an open menu back inside the window but lets it
// touch the edge, so a wide list on a right-hand card ends up flush with the window.
const popupMarginPx = 12;

const keepPopupMargin = (defaultConfig: Record<string, any>) => ({
	middleware: (defaultConfig.middleware as Middleware[]).map(middleware => (
		middleware.name === 'shift' ? shift({ boundary: 'clippingAncestors', padding: popupMarginPx }) : middleware
	)),
});

const attachMenu = (toggle: HTMLElement, menuElement: HTMLElement, config?: Partial<MenuConfig>) => {
	const menu = Menu.getOrCreateInstance(toggle, { floatingConfig: keepPopupMargin, ...config });
	return () => {
		menu.dispose();
		for (const event of submenuEvents) EventHandler.off(menuElement, event);
	};
};

export default attachMenu;
