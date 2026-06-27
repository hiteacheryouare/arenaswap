interface bsoIndicatorProps {
	balls: number;
	strikes: number;
	outs: number;
}

const bsoGroup = (label: string, count: number, max: number, fillColor: string) => (
	<div className='d-flex align-items-center gap-1'>
		<span className='bso-label'>{label}</span>
		{Array.from({ length: max }, (_, i) => (
			<i
				key={i}
				className={`bi ${i < count ? 'bi-circle-fill' : 'bi-circle'} bso-dot`}
				style={{ color: i < count ? fillColor : '#4b5563' }}
			/>
		))}
	</div>
);

const bsoIndicator = ({ balls, strikes, outs }: bsoIndicatorProps) => (
	<div className='d-flex align-items-center gap-2 bso-indicator'>
		{bsoGroup('B', balls, 3, '#4ade80')}
		{bsoGroup('S', strikes, 2, '#f75c03')}
		{bsoGroup('O', outs, 2, '#ef4444')}
	</div>
);

export default bsoIndicator;
