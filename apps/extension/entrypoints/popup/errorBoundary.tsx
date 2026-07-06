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
			return (
				<div className='popup-container d-flex flex-column align-items-center justify-content-center gap-3 text-center'>
					<img src='/images/full_logo_white_on_transparent.svg' alt='ArenaSwap' className='arenaswap-logo mb-1' />
					<div>
						<i className='bi bi-exclamation-triangle-fill text-danger fs-3' />
						<div className='fw-bold mt-2'>Something went wrong.</div>
						<div className='text-body-secondary small mt-1'>ArenaSwap hit an unexpected error.</div>
					</div>
					<div className='alert alert-danger w-100 py-2 px-3 text-start small text-break mb-0' role='alert'>
						<strong>Error:</strong> {this.state.error.message}
					</div>
					<button
						className='btn btn-danger btn-sm'
						onClick={() => this.setState({ error: null })}
					>
						<i className='bi bi-arrow-clockwise me-1' />
						Try again
					</button>
				</div>
			);
		}
		return this.props.children;
	}
}

export default ErrorBoundary;
