// The loop behind the boxes, in our colours the way a broadcast's studio loop is in theirs: the
// store art's glow rising off the bottom of the window and the wordmark's dashed line drifting
// across. The logo holds the middle while there are no boxes to show.
const MultiviewBackdrop = ({ showMark }: { showMark: boolean }) => (
	<div className='multiview-backdrop' aria-hidden='true'>
		<div className='multiview-glow' />
		<div className='multiview-dashes' />
		<img className={showMark ? 'multiview-mark' : 'multiview-mark multiview-mark-gone'} src='/images/full_logo_white_on_transparent.svg' alt='' />
	</div>
);

export default MultiviewBackdrop;
