import { useRef } from 'react';
import { i18n } from '#i18n';
import type { toastItem } from '../useToast';

interface toastContainerProps {
	toasts: toastItem[];
	onDismiss: (id: string) => void;
	onPause?: (id: string) => void;
	onResume?: (id: string) => void;
}

const variantConfig: Record<string, { icon: string; label: string }> = {
	success: { icon: 'bi-check-circle-fill fg-success', label: i18n.t('toast.success') },
	error:   { icon: 'bi-x-circle-fill fg-danger',      label: i18n.t('toast.error') },
	info:    { icon: 'bi-info-circle-fill fg-primary',   label: i18n.t('toast.info') },
};

const toastContainer = ({ toasts, onDismiss, onPause, onResume }: toastContainerProps) => {
	const holds = useRef(new Map<string, { hovered: boolean; focused: boolean }>());
	if (!toasts.length) return null;
	return (
		<div className='toast-container position-fixed bottom-0 start-50 translate-middle-x pb-5'>
			{toasts.map(toast => {
				const { icon, label } = variantConfig[toast.variant] ?? variantConfig['info']!;
				const urgent = toast.variant === 'error';
				const hold = (change: Partial<{ hovered: boolean; focused: boolean }>) => {
					const state = { ...holds.current.get(toast.id) ?? { hovered: false, focused: false }, ...change };
					holds.current.set(toast.id, state);
					if (state.hovered || state.focused) onPause?.(toast.id);
					else onResume?.(toast.id);
				};
				const pause = urgent ? () => hold({ hovered: true }) : undefined;
				const resume = urgent ? () => hold({ hovered: false }) : undefined;
				const pauseOnFocus = urgent ? () => hold({ focused: true }) : undefined;
				const resumeOnBlur = urgent ? (event: React.FocusEvent<HTMLElement>) => {
					if (!event.relatedTarget || !event.currentTarget.contains(event.relatedTarget)) hold({ focused: false });
				} : undefined;
				return (
					<div
						key={toast.id}
						className={`toast show toast-slide-up${toast.leaving ? ' is-leaving' : ''}`}
						role={urgent ? 'alert' : 'status'}
						aria-live={urgent ? 'assertive' : 'polite'}
						aria-atomic='true'
						onMouseEnter={pause}
						onFocus={pauseOnFocus}
						onMouseLeave={resume}
						onBlur={resumeOnBlur}
					>
						<div className='toast-header'>
							<i className={`bi ${icon} me-3`} />
							<strong className='me-auto'>{label}</strong>
							<button type='button' className='btn-close' onClick={() => onDismiss(toast.id)} aria-label={i18n.t('toast.close')} />
						</div>
						<div className='toast-body'>{toast.message}</div>
					</div>
				);
			})}
		</div>
	);
};

export default toastContainer;
