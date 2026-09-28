import { i18n } from '#i18n';

interface reviewPromptBannerProps {
	onDismiss: () => void;
	onLeaveReview: () => void;
}

const reviewPromptBanner = ({ onDismiss, onLeaveReview }: reviewPromptBannerProps) => (
	<div className='as-notice' role='note'>
		<i className='bi bi-star as-notice-icon' aria-hidden='true' />
		<div className='as-notice-body'>
			<span className='as-notice-title'>{i18n.t('reviewPrompt.title')}</span>
			<span className='as-notice-copy'>{i18n.t('reviewPrompt.copy')}</span>
			<div className='as-notice-actions'>
				<button type='button' className='btn btn-primary' onClick={onLeaveReview}>{i18n.t('reviewPrompt.leaveReview')}</button>
			</div>
		</div>
		<button type='button' className='as-icon as-notice-close' aria-label={i18n.t('reviewPrompt.dismiss')} onClick={onDismiss}>
			<i className='bi bi-x-lg' aria-hidden='true' />
		</button>
	</div>
);

export default reviewPromptBanner;
