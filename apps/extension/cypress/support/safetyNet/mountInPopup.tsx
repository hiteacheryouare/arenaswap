import type { ReactNode } from 'react';
import { english, withLocale, type shippedLocale } from './locales';

export const popupViewport = { width: 320, height: 560 };

export const popupSurface = '.popup-root';

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

export const mountPopupView = (node: ReactNode, locale: shippedLocale = english) => {
	cy.viewport(popupViewport.width, popupViewport.height);
	return cy.mount(withLocale(locale, (
		<div className='popup-root'>
			<div className='popup-view-shell is-opening-view'>{node}</div>
		</div>
	)));
};
