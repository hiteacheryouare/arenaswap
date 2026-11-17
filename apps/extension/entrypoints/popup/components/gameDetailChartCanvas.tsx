import { useEffect, useRef } from 'react';
import * as echarts from 'echarts/core';
import { BarChart, LineChart } from 'echarts/charts';
import { GridComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import type { EChartsOption, EChartsType } from 'echarts';

echarts.use([LineChart, BarChart, GridComponent, TooltipComponent, CanvasRenderer]);

interface gameDetailChartCanvasProps {
	option: EChartsOption;
}

const gameDetailChartCanvas = ({ option }: gameDetailChartCanvasProps) => {
	const chartElementRef = useRef<HTMLDivElement | null>(null);
	const chartInstanceRef = useRef<EChartsType | null>(null);
	const optionRef = useRef(option);
	optionRef.current = option;

	// Observed rather than listening on the window: a chart that mounts inside a hidden tab pane
	// starts at 0x0, and the pane being shown is a resize the window never hears about.
	useEffect(() => {
		const element = chartElementRef.current;
		if (!element) return;
		const instance = echarts.init(element, undefined, { renderer: 'canvas' });
		chartInstanceRef.current = instance;
		instance.setOption(optionRef.current, true);
		const observer = new ResizeObserver(() => instance.resize());
		observer.observe(element);

		return () => {
			observer.disconnect();
			instance.dispose();
			chartInstanceRef.current = null;
		};
	}, []);

	useEffect(() => {
		chartInstanceRef.current?.setOption(option, true);
	}, [option]);

	return <div ref={chartElementRef} className='game-detail-chart-canvas' />;
};

export default gameDetailChartCanvas;
