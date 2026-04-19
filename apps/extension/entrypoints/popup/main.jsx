import React from 'react';
import reactDomClient from 'react-dom/client';
import '../../assets/bootstrap.scss';
import '../../assets/global.scss';
import App from './app';
import ErrorBoundary from './errorBoundary';

reactDomClient.createRoot(document.getElementById('root')).render(
	<React.StrictMode>
		<ErrorBoundary>
			<App />
		</ErrorBoundary>
	</React.StrictMode>,
);
