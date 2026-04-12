import React from 'react';
import reactDomClient from 'react-dom/client';
import '../../assets/bootstrap.scss';
import '../../assets/global.scss';
import App from './app';

reactDomClient.createRoot(document.getElementById('root')).render(
	<React.StrictMode>
		<App />
	</React.StrictMode>,
);
