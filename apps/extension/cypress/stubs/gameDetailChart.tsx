const gameDetailChart = ({ title }: { title: string }) => (
	<section className='game-detail-chart-card' data-testid='game-detail-chart'>
		<div className='game-detail-chart-title'>{title}</div>
		<div className='game-detail-chart-canvas' />
	</section>
);
export default gameDetailChart;
