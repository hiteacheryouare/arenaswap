interface reviewPromptBannerProps {
	onDismiss: () => void;
	onLeaveReview: () => void;
}

const reviewPromptBanner = ({ onDismiss, onLeaveReview }: reviewPromptBannerProps) => (
	<div className='alert alert-primary d-flex align-items-start gap-2 py-2 px-2 mb-2' role='note'>
		<i className='bi bi-star mt-[0.08rem]' aria-hidden='true' />
		<div className='grow min-w-0'>
			<div className='fw-bold text-[0.72rem] leading-tight'>Enjoying ArenaSwap?</div>
			<div className='text-[0.62rem] leading-snug'>
				A quick review helps more fans find the best game ❤️
			</div>
			<button type='button' className='btn btn-sm btn-primary mt-2 py-0 px-2 text-[0.65rem]' onClick={onLeaveReview}>
				Leave review
			</button>
		</div>
		<button type='button' className='btn-close btn-sm shrink-0' aria-label='Dismiss review request' onClick={onDismiss} />
	</div>
);

export default reviewPromptBanner;
