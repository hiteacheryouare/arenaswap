// The loop behind the boxes, in our colours the way a broadcast's studio loop is in theirs: two slow
// sweeps of light and the wordmark's dashed line drifting across. The logo holds the middle until the
// first stream starts.
const MultiviewBackdrop = ({ showMark }: { showMark: boolean }) => (
	<div className='multiview-backdrop' aria-hidden='true'>
		<div className='multiview-sweep' />
		<div className='multiview-sweep multiview-sweep-slow' />
		<div className='multiview-dashes' />
		<img className={showMark ? 'multiview-mark' : 'multiview-mark multiview-mark-gone'} src='/images/full_logo_white_on_transparent.svg' alt='' />
	</div>
);

export default MultiviewBackdrop;
