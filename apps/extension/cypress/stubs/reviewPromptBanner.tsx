const reviewPromptBanner = ({
	onDismiss,
	onLeaveReview,
}: {
	onDismiss: () => void;
	onLeaveReview: () => void;
}) => (
	<div data-testid='review-prompt'>
		<button type='button' onClick={onLeaveReview}>Leave review</button>
		<button type='button' onClick={onDismiss}>Dismiss</button>
	</div>
);
export default reviewPromptBanner;
