import { Suspense, lazy } from 'react';
import type { EChartsOption } from 'echarts';

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
	<section className='game-detail-chart-card'>
		<div className='game-detail-chart-title'>{title}</div>
		{legendItems.length > 0 && (
			<div className='game-detail-chart-inline-legend'>
				{legendItems.map(item => (
					<div key={item.label} className='game-detail-chart-legend-item'>
						<span className='game-detail-chart-legend-swatch' style={{ backgroundColor: item.color }} />
						<span>{item.label}</span>
					</div>
				))}
			</div>
		)}
		<Suspense fallback={<div className='game-detail-chart-canvas' />}>
			<GameDetailChartCanvas option={option} />
		</Suspense>
	</section>
);

export default gameDetailChart;
