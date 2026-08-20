import { i18n } from '#i18n';

interface reviewPromptBannerProps {
	onDismiss: () => void;
	onLeaveReview: () => void;
}

const reviewPromptBanner = ({ onDismiss, onLeaveReview }: reviewPromptBannerProps) => (
	<div className='alert alert-primary d-flex align-items-start gap-2 py-2 px-2 mb-2' role='note'>
		<i className='bi bi-star' aria-hidden='true' />
		<div className='min-w-0'>
			<div className='fw-bold'>{i18n.t('reviewPrompt.title')}</div>
			<div>
				{i18n.t('reviewPrompt.copy')}
			</div>
			<button type='button' className='btn btn-sm btn-primary mt-2 py-0 px-2' onClick={onLeaveReview}>
				{i18n.t('reviewPrompt.leaveReview')}
			</button>
		</div>
		<button type='button' className='btn-close btn-sm flex-shrink-0' aria-label={i18n.t('reviewPrompt.dismiss')} onClick={onDismiss} />
	</div>
);

export default reviewPromptBanner;
