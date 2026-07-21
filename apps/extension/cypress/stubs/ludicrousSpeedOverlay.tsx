const ludicrousSpeedOverlay = ({ onClose }: { onClose: () => void }) => (
	<div data-testid='ludicrous-speed-overlay'>
		<button onClick={onClose}>Close</button>
	</div>
);
export default ludicrousSpeedOverlay;
