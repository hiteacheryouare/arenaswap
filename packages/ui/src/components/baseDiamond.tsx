interface baseDiamondProps {
	first: boolean;
	second: boolean;
	third: boolean;
}

// Diamond corners at (10,4)(16,10)(10,16)(4,10) inside a 20×20 viewBox.
// Each 3.5×3.5 rect rotated 45° extends ~3px from center — fits within the
// 4px margin on all sides without clipping.
const base = (cx: number, cy: number, occupied: boolean) => (
	<rect
		x={cx - 1.75}
		y={cy - 1.75}
		width={3.5}
		height={3.5}
		transform={`rotate(45 ${cx} ${cy})`}
		fill={occupied ? '#fbbf24' : 'none'}
		stroke={occupied ? '#fbbf24' : '#9ca3af'}
		strokeWidth={1}
		opacity={occupied ? 1 : 0.6}
	/>
);

const baseDiamond = ({ first, second, third }: baseDiamondProps) => {

	return (
		<svg width='28' height='28' viewBox='0 0 20 20'>
			<polygon
				points='10,4 16,10 10,16 4,10'
				fill='none'
				stroke='#9ca3af'
				strokeWidth='0.6'
				opacity='0.35'
			/>
			{base(10, 4, second)}
			{base(16, 10, first)}
			{base(10, 16, false)}
			{base(4, 10, third)}
		</svg>
	);
};

export default baseDiamond;
