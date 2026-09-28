import { i18n } from '#i18n';

interface suggestBannerProps {
	count: number;
	onReview: () => void;
	onDismiss: () => void;
}

const suggestBanner = ({ count, onReview, onDismiss }: suggestBannerProps) => (
	<div className='as-notice' role='note'>
		<i className='bi bi-magic as-notice-icon' aria-hidden='true' />
		<div className='as-notice-body'>
			<span className='as-notice-title'>{i18n.t('suggest.bannerTitle')}</span>
			<span className='as-notice-copy'>{i18n.t('suggest.bannerCopy', count)}</span>
			<div className='as-notice-actions'>
				<button type='button' className='btn btn-primary' onClick={onReview}>{i18n.t('suggest.bannerAction')}</button>
			</div>
		</div>
		<button type='button' className='as-icon as-notice-close' aria-label={i18n.t('suggest.bannerDismiss')} onClick={onDismiss}>
			<i className='bi bi-x-lg' aria-hidden='true' />
		</button>
	</div>
);

export default suggestBanner;
