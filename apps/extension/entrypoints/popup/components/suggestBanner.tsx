import { i18n } from '#i18n';

interface suggestBannerProps {
	count: number;
	onReview: () => void;
	onDismiss: () => void;
}

const suggestBanner = ({ count, onReview, onDismiss }: suggestBannerProps) => (
	<div className='alert popup-notice d-flex align-items-start gap-2' role='note'>
		<i className='bi bi-magic popup-notice-icon' aria-hidden='true' />
		<div className='min-w-0'>
			<div className='fw-bold popup-notice-title'>{i18n.t('suggest.bannerTitle')}</div>
			<div>{i18n.t('suggest.bannerCopy', count)}</div>
			<button type='button' className='btn btn-sm btn-primary mt-2 py-0 px-2 popup-notice-action' onClick={onReview}>
				{i18n.t('suggest.bannerAction')}
			</button>
		</div>
		<button type='button' className='btn-close flex-shrink-0' aria-label={i18n.t('suggest.bannerDismiss')} onClick={onDismiss} />
	</div>
);

export default suggestBanner;
