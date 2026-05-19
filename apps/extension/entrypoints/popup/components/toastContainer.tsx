import type { toastItem } from '../useToast';

interface toastContainerProps {
	toasts: toastItem[];
	onDismiss: (id: string) => void;
}

const variantConfig: Record<string, { icon: string; label: string }> = {
	success: { icon: 'bi-check-circle-fill text-success', label: 'Success' },
	error:   { icon: 'bi-x-circle-fill text-danger',      label: 'Error' },
	info:    { icon: 'bi-info-circle-fill text-primary',   label: 'Info' },
};

const toastContainer = ({ toasts, onDismiss }: toastContainerProps) => {
	if (!toasts.length) return null;
	return (
		<div className='toast-container position-fixed bottom-0 start-50 translate-middle-x pb-3'>
			{toasts.map(toast => {
				const { icon, label } = variantConfig[toast.variant];
				return (
					<div key={toast.id} className='toast show toast-slide-up' role='alert' aria-live='assertive' aria-atomic='true'>
						<div className='toast-header'>
							<i className={`bi ${icon} me-2`} />
							<strong className='me-auto'>{label}</strong>
							<button type='button' className='btn-close btn-close-white' onClick={() => onDismiss(toast.id)} aria-label='Close' />
						</div>
						<div className='toast-body'>{toast.message}</div>
					</div>
				);
			})}
		</div>
	);
};

export default toastContainer;
