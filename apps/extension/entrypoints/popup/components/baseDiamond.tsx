interface baseDiamondProps {
	first: boolean;
	second: boolean;
	third: boolean;
}

const baseDiamond = ({ first, second, third }: baseDiamondProps) => {
	const base = (cx: number, cy: number, occupied: boolean) => (
		<rect
			x={cx - 2.8}
			y={cy - 2.8}
			width={5.6}
			height={5.6}
			transform={`rotate(45 ${cx} ${cy})`}
			fill={occupied ? '#fbbf24' : 'none'}
			stroke={occupied ? '#fbbf24' : '#6b7280'}
			strokeWidth={occupied ? 0 : 1.25}
		/>
	);

	return (
		<svg width='16' height='16' viewBox='0 0 20 20'>
			<polygon
				points='10,2 18,10 10,18 2,10'
				fill='none'
				stroke='#6b7280'
				strokeWidth='0.5'
				opacity='0.3'
			/>
			{base(10, 2, second)}
			{base(18, 10, first)}
			{base(10, 18, false)}
			{base(2, 10, third)}
		</svg>
	);
};

export default baseDiamond;
