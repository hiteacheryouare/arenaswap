import { Component } from 'react';
import type { ReactNode } from 'react';

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
			const message = this.state.error.message || 'unknown anomaly detected';
			return (
				<div className='popup-container error-boundary-shell'>
					<div className='error-boundary-flash' aria-hidden='true' />
					<div className='error-boundary-scanlines' aria-hidden='true' />
					<div className='error-boundary-vignette' aria-hidden='true' />
					<div className='error-boundary-content d-flex flex-column align-items-center justify-content-center gap-3 text-center'>
						<div className='error-boundary-skull' aria-hidden='true'>
							<i className='bi bi-radioactive' />
						</div>
						<div className='error-boundary-banner' role='status'>
							🚨 CRITICAL SYSTEM ERROR 🚨
						</div>
						<div>
							<div className='error-boundary-title'>
								ARENASWAP HAS CRASHED
							</div>
							<div className='error-boundary-subtitle'>
								Something clearly went wrong during rendering.
							</div>
						</div>
						<div className='error-boundary-stack' role='alert'>
							<div className='error-boundary-stack-label'>error data: </div>
							<div className='error-boundary-stack-message'>
								&gt; {message}
							</div>
						</div>
						<button
							className='btn btn-danger btn-sm error-boundary-retry'
							onClick={() => this.setState({ error: null })}
						>
							<i className='bi bi-arrow-clockwise me-1' />
							Retry
						</button>
					</div>
				</div>
			);
		}
		return this.props.children;
	}
}

export default ErrorBoundary;
