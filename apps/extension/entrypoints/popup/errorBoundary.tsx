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
					<i className='bi bi-exclamation-triangle-fill text-danger error-boundary-icon text-[3rem]' />
					<div>
						<div className='fw-bold text-danger text-[1.05rem] tracking-[-0.01em]'>
							🚨 ARENASWAP HAS CRASHED 🚨
						</div>
						<div className='text-body-secondary mt-1 text-[0.7rem]'>
							Something clearly went wrong during rendering.
						</div>
					</div>
					<div className='alert alert-danger w-100 py-2 px-3 text-start text-[0.65rem] break-words' role='alert'>
						<strong>error data:</strong> {this.state.error.message}
					</div>
					<button
						className='btn btn-danger btn-sm'
						onClick={() => this.setState({ error: null })}
					>
						<i className='bi bi-arrow-clockwise me-1' />
						Retry
					</button>
				</div>
			);
		}
		return this.props.children;
	}
}

export default ErrorBoundary;
