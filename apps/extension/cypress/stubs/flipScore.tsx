// Drops the roll animation only; className is preserved so geometry specs still measure the
// real scoreboard-figures styling.
const flipScore = ({ value, className }: { value: number; className?: string }) => (
	<span className={className}>{value}</span>
);
export default flipScore;
