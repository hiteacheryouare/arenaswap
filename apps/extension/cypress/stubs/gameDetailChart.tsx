// Drops the echarts canvas only. The card keeps the real chart's structure and height so scroll
// and sticky-bar specs measure the page length a live detail screen actually has.
const gameDetailChart = ({ title }: { title: string }) => (
	<section className='game-detail-chart-card' data-testid='game-detail-chart'>
		<div className='game-detail-chart-title'>{title}</div>
		<div className='game-detail-chart-canvas' />
	</section>
);
export default gameDetailChart;
