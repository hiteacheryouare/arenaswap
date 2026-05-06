interface baseDiamondProps {
	first: boolean;
	second: boolean;
	third: boolean;
}

const baseDiamond = ({ first, second, third }: baseDiamondProps) => {
	const baseClass = (occupied: boolean) =>
		`bi ${occupied ? 'bi-square-fill text-warning dark:text-yellow-400' : 'bi-square text-secondary dark:text-gray-500 opacity-50'} rotate-45 text-[9px]`;

	return (
		<div className='relative w-[26px] h-[26px] shrink-0'>
			<i className={`${baseClass(second)} absolute top-0 left-1/2 -translate-x-1/2`} />
			<i className={`${baseClass(third)} absolute top-1/2 left-0 -translate-y-1/2`} />
			<i className={`${baseClass(first)} absolute top-1/2 right-0 -translate-y-1/2`} />
		</div>
	);
};

export default baseDiamond;
