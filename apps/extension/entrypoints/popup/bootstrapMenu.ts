import Menu from 'bootstrap/js/dist/menu.js';
import EventHandler from 'bootstrap/js/dist/dom/event-handler.js';
import type { MenuConfig } from 'bootstrap/js/dist/menu.js';

// Bootstrap 6.0.0-alpha.1's Menu.dispose() leaves the submenu handlers it put on the menu itself in
// its module-wide event registry, and that registry then holds every unmounted menu, and the card
// around it, for the life of the popup.
const submenuEvents = ['mouseenter', 'mouseleave', 'mousemove', 'click'];

const attachMenu = (toggle: HTMLElement, menuElement: HTMLElement, config?: Partial<MenuConfig>) => {
	const menu = Menu.getOrCreateInstance(toggle, config);
	return () => {
		menu.dispose();
		for (const event of submenuEvents) EventHandler.off(menuElement, event);
	};
};

export default attachMenu;
