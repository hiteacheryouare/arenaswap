// Drops the echarts canvas only. The card keeps the real chart's structure and height so scroll
// and sticky-bar specs measure the page length a live detail screen actually has.
const gameDetailChart = ({ title }: { title: string }) => (
	<section className='card dt-card dt-chart' data-testid='game-detail-chart'>
		<h3 className='dt-card-title'>{title}</h3>
		<div className='dt-canvas' />
	</section>
);
export default gameDetailChart;
