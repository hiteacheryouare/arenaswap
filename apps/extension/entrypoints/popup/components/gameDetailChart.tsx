import { useEffect, useRef } from 'react';
import type { EChartsOption, EChartsType } from 'echarts';

interface gameDetailChartProps {
	title: string;
	option: EChartsOption;
}

const gameDetailChart = ({ title, option }: gameDetailChartProps) => {
	const chartElementRef = useRef<HTMLDivElement | null>(null);
	const chartInstanceRef = useRef<EChartsType | null>(null);
	const resizeHandlerRef = useRef<(() => void) | null>(null);

	useEffect(() => {
		let isMounted = true;
		void import('echarts').then(echarts => {
			if (!isMounted || !chartElementRef.current) return;
			const instance = echarts.init(chartElementRef.current, undefined, { renderer: 'canvas' });
			chartInstanceRef.current = instance;
			instance.setOption(option, true);
			const onResize = () => instance.resize();
			resizeHandlerRef.current = onResize;
			window.addEventListener('resize', onResize);
		});

		return () => {
			isMounted = false;
			if (resizeHandlerRef.current) {
				window.removeEventListener('resize', resizeHandlerRef.current);
				resizeHandlerRef.current = null;
			}
			chartInstanceRef.current?.dispose();
			chartInstanceRef.current = null;
		};
	}, []);

	useEffect(() => {
		chartInstanceRef.current?.setOption(option, true);
	}, [option]);

	return (
		<section className='game-detail-chart-card'>
			<div className='game-detail-chart-title'>{title}</div>
			<div ref={chartElementRef} className='game-detail-chart-canvas' />
		</section>
	);
};

export default gameDetailChart;
