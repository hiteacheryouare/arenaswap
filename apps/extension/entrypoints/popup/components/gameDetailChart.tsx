import { Suspense, lazy } from 'react';
import type { EChartsOption } from 'echarts';

// echarts is most of the popup's vendor weight and these four cards are the only charts in the
// product, so the canvas loads behind an import() and the card's empty canvas holds its height.
const GameDetailChartCanvas = lazy(() => import('./gameDetailChartCanvas'));

interface gameDetailChartLegendItem {
	label: string;
	color: string;
}

interface gameDetailChartProps {
	title: string;
	option: EChartsOption;
	legendItems?: gameDetailChartLegendItem[];
}

const gameDetailChart = ({ title, option, legendItems = [] }: gameDetailChartProps) => (
	<section className='card dt-card dt-chart'>
		<h3 className='dt-card-title'>{title}</h3>
		{legendItems.length > 0 && (
			<ul className='dt-legend'>
				{legendItems.map(item => (
					<li key={item.label}>
						<i style={{ backgroundColor: item.color }} aria-hidden='true' />
						{item.label}
					</li>
				))}
			</ul>
		)}
		<Suspense fallback={<div className='dt-canvas' />}>
			<GameDetailChartCanvas option={option} label={title} />
		</Suspense>
	</section>
);

export default gameDetailChart;
