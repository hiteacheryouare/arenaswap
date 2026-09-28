import { Component } from 'react';
import type { ReactNode } from 'react';
import { i18n } from '#i18n';
import Wordmark from '@arenaswap/ui/src/components/wordmark';

interface errorBoundaryProps {
	children: ReactNode;
}

interface errorBoundaryState {
	error: Error | null;
}

class ErrorBoundary extends Component<errorBoundaryProps, errorBoundaryState> {
	state: errorBoundaryState = { error: null };

	static getDerivedStateFromError(error: Error): errorBoundaryState {
		return { error };
	}

	render() {
		if (this.state.error) {
			return (
				<div className='popup-container as-crash'>
					<Wordmark className='as-crash-mark' />
					<div className='as-empty'>
						<h2>{i18n.t('errorBoundary.title')}</h2>
						<p>{i18n.t('errorBoundary.body')}</p>
					</div>
					<div className='as-notice is-danger' role='alert'>
						<i className='bi bi-exclamation-triangle as-notice-icon' aria-hidden='true' />
						<div className='as-notice-body'>
							<span className='as-notice-title'>{i18n.t('errorBoundary.errorLabel')}</span>
							<span className='as-notice-copy text-break'>{this.state.error.message}</span>
						</div>
					</div>
					<button type='button' className='btn btn-primary w-100' onClick={() => this.setState({ error: null })}>
						<i className='bi bi-arrow-clockwise me-2' aria-hidden='true' />
						{i18n.t('errorBoundary.tryAgain')}
					</button>
				</div>
			);
		}
		return this.props.children;
	}
}

export default ErrorBoundary;
