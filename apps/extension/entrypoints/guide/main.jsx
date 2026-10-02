import React from 'react';
import reactDomClient from 'react-dom/client';
import '../../assets/bootstrap.scss';
import '../../assets/global.scss';
import '../../assets/guide.scss';
import App from './app';
import ErrorBoundary from '../popup/errorBoundary';
import { LocaleContext } from '@arenaswap/ui/src/components/i18nContext';
import { displayLocale } from '../../utils/displayLocale';

reactDomClient.createRoot(document.getElementById('root')).render(
	<React.StrictMode>
		<LocaleContext.Provider value={displayLocale()}>
			<ErrorBoundary>
				<App />
			</ErrorBoundary>
		</LocaleContext.Provider>
	</React.StrictMode>,
);
