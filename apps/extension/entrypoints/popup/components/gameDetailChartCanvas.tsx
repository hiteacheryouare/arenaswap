import { useEffect, useRef } from 'react';
import * as echarts from 'echarts/core';
import { BarChart, LineChart } from 'echarts/charts';
import { GridComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import type { EChartsOption, EChartsType } from 'echarts';

// The option builders in @arenaswap/ui only ever emit line and bar series on a cartesian grid with
// an axis tooltip, so registering those five keeps the full echarts bundle (1.1MB) out of this
// chunk in favour of 513KB. apps/docs renders the same four builders off this same registration.
echarts.use([LineChart, BarChart, GridComponent, TooltipComponent, CanvasRenderer]);

interface gameDetailChartCanvasProps {
	option: EChartsOption;
}

const gameDetailChartCanvas = ({ option }: gameDetailChartCanvasProps) => {
	const chartElementRef = useRef<HTMLDivElement | null>(null);
	const chartInstanceRef = useRef<EChartsType | null>(null);
	const resizeHandlerRef = useRef<(() => void) | null>(null);
	const optionRef = useRef(option);
	optionRef.current = option;

	useEffect(() => {
		if (!chartElementRef.current) return;
		const instance = echarts.init(chartElementRef.current, undefined, { renderer: 'canvas' });
		chartInstanceRef.current = instance;
		instance.setOption(optionRef.current, true);
		const onResize = () => instance.resize();
		resizeHandlerRef.current = onResize;
		window.addEventListener('resize', onResize);

		return () => {
			if (resizeHandlerRef.current) {
				window.removeEventListener('resize', resizeHandlerRef.current);
				resizeHandlerRef.current = null;
			}
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
