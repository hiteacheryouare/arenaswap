import type { ReactNode } from 'react';
import { english, withLocale, type shippedLocale } from './locales';

// The popup window is 320x560 (`.popup-root` in assets/bootstrap.scss, `.popup-container` in
// packages/ui/src/_popup.scss).
export const popupViewport = { width: 320, height: 560 };

export const popupSurface = '.popup-root';

// Mounts inside the same three boxes app.tsx renders every view in, so the surface has the popup's
// own width, padding and overflow rather than a number copied into the spec. `is-opening-view`
// holds the view still, as it is when the popup first opens. Assert on `popupSurface`.
export const mountInPopup = (node: ReactNode, locale: shippedLocale = english) => {
	cy.viewport(popupViewport.width, popupViewport.height);
	return cy.mount(withLocale(locale, (
		<div className='popup-root'>
			<div className='popup-view-shell is-opening-view'>
				<div className='popup-container'>{node}</div>
			</div>
		</div>
	)));
};

// For the views that render their own `.popup-container`, such as the main list and the suggest
// view. Same shell as app.tsx, minus the container, so the view brings the one it ships with.
export const mountPopupView = (node: ReactNode, locale: shippedLocale = english) => {
	cy.viewport(popupViewport.width, popupViewport.height);
	return cy.mount(withLocale(locale, (
		<div className='popup-root'>
			<div className='popup-view-shell is-opening-view'>{node}</div>
		</div>
	)));
};
