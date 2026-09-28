import { i18n } from '#i18n';
import type { toastItem } from '../useToast';

interface toastContainerProps {
	toasts: toastItem[];
	onDismiss: (id: string) => void;
}

const variantConfig: Record<string, { icon: string; label: string }> = {
	success: { icon: 'bi-check-circle-fill is-success', label: i18n.t('toast.success') },
	error:   { icon: 'bi-x-circle-fill is-error',       label: i18n.t('toast.error') },
	info:    { icon: 'bi-info-circle-fill is-info',     label: i18n.t('toast.info') },
};

const toastContainer = ({ toasts, onDismiss }: toastContainerProps) => {
	if (!toasts.length) return null;
	return (
		<div className='toast-container position-fixed bottom-0 start-50 translate-middle-x pb-3'>
			{toasts.map(toast => {
				const { icon, label } = variantConfig[toast.variant] ?? variantConfig['info']!;
				return (
					<div key={toast.id} className='toast show toast-slide-up as-toast' role='alert' aria-live='assertive' aria-atomic='true'>
						<i className={`bi ${icon} as-toast-icon`} aria-hidden='true' />
						<span className='visually-hidden'>{label}</span>
						<div className='as-toast-message'>{toast.message}</div>
						<button type='button' className='as-icon as-toast-close' onClick={() => onDismiss(toast.id)} aria-label={i18n.t('toast.close')}>
							<i className='bi bi-x-lg' aria-hidden='true' />
						</button>
					</div>
				);
			})}
		</div>
	);
};

export default toastContainer;
