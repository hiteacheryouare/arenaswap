// Stubbed to drop the roll animation only — className is preserved so specs that measure
// score geometry see the real scoreboard-figures styling.
const flipScore = ({ value, className }: { value: number; className?: string }) => (
	<span className={className}>{value}</span>
);
export default flipScore;
