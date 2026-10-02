import React from 'react';
import reactDomClient from 'react-dom/client';
import '../../assets/bootstrap.scss';
import '../../assets/global.scss';
import { LocaleContext } from '@arenaswap/ui/src/components/i18nContext';
import App from './app';
import ErrorBoundary from './errorBoundary';
import { displayLocale } from '../../utils/displayLocale';

const locale = displayLocale();
// index.html says en, which had screen readers voicing every translation with an English voice.
document.documentElement.lang = locale;

reactDomClient.createRoot(document.getElementById('root')).render(
	<React.StrictMode>
		<LocaleContext.Provider value={locale}>
			<ErrorBoundary>
				<App />
			</ErrorBoundary>
		</LocaleContext.Provider>
	</React.StrictMode>,
);
