import React from 'react';
import RD from 'react-dom/client';
import '../../assets/bootstrap.scss';
import '../../assets/global.css';
import App from './App';

RD.createRoot(document.getElementById('root')!).render(
	<React.StrictMode>
		<App />
	</React.StrictMode>,
);
