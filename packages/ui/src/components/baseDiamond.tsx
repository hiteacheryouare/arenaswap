interface baseDiamondProps {
	first: boolean;
	second: boolean;
	third: boolean;
}

// Three rounded diamonds in a triangle: 2nd on top, 3rd lower-left, 1st
// lower-right. No home plate and no outline — occupancy is the whole signal.
const base = (name: string, occupied: boolean) => (
	<i
		className={`bi bi-diamond-fill base-marker base-${name}${occupied ? ' occupied' : ''}`}
		aria-hidden='true'
	/>
);

const baseDiamond = ({ first, second, third }: baseDiamondProps) => {

	return (
		<div className='base-diamond'>
			{base('second', second)}
			{base('third', third)}
			{base('first', first)}
		</div>
	);
};

export default baseDiamond;
