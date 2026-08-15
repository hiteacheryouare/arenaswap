import { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts/core';
import { LineChart } from 'echarts/charts';
import { GridComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import type { EChartsOption } from 'echarts';

echarts.use([LineChart, GridComponent, CanvasRenderer]);

// Four looping scenes: watch every live game, score each one, open one for the full breakdown,
// land the tab on the best. The scenes are SVG/CSS; the PowerScore trend is a real ECharts graph.

const SCENES = 4;
const DURATIONS = [4200, 4200, 6000, 8200];

// OrangeDots.astro skips React islands, so the orange-dot flourish is applied here instead.
const CAPTIONS = [
	'It watches every live game across your leagues',
	'And scores each one on how exciting it is, live',
	'Open a game to see exactly why',
	'Then your tab lands on the best one',
];

const BASE = '/arenaswap/images';
const ORANGE = '#F75C03';

// Curated to logos that read clearly on the dark background; dark navy and black crests like
// the NHL and Champions League marks are dropped.
const NET = [
	{ id: 'nba', s: 88 }, { id: 'nfl', s: 72 }, { id: 'mlb', s: 59 }, { id: 'wnba', s: 80 },
	{ id: 'nhl', s: 64 }, { id: 'mls', s: 62 }, { id: 'laliga', s: 68 },
	{ id: 'bundesliga', s: 74 }, { id: 'ncaaf', s: 66 },
];
const CX = 480;
const CY = 360;
const R = 300;
const NODES = NET.map((n, i) => {
	const angle = (i / NET.length) * Math.PI * 2 - Math.PI / 2;
	return {
		id: n.id,
		score: n.s,
		logo: `${BASE}/leagues/${n.id}.png`,
		x: CX + R * Math.cos(angle),
		y: CY + R * Math.sin(angle),
	};
});

const NetworkScene = ({ showScores }: { showScores: boolean }) => (
	<svg className='mw-net' viewBox='0 0 960 720' data-scores={showScores} role='img' aria-label='ArenaSwap watching and scoring every live game'>
		{NODES.map((n, i) => (
			<g key={`wire-${n.id}`}>
				<line className='mw-wire-base' x1={n.x} y1={n.y} x2={CX} y2={CY} />
				<line className='mw-wire-dot' x1={n.x} y1={n.y} x2={CX} y2={CY} style={{ animationDelay: `${(i % 6) * 0.2}s` }} />
			</g>
		))}

		<circle className='mw-core-glow' cx={CX} cy={CY} r={92} />
		<circle className='mw-core-ring' cx={CX} cy={CY} r={60} />
		<image href={`${BASE}/icon_white_on_transparent.png`} x={CX - 34} y={CY - 30} width={68} height={60} preserveAspectRatio='xMidYMid meet' />

		{NODES.map(n => (
			<g key={`node-${n.id}`} className='mw-node'>
				<circle className='mw-chip' cx={n.x} cy={n.y} r={37} />
				<image href={n.logo} x={n.x - 26} y={n.y - 26} width={52} height={52} preserveAspectRatio='xMidYMid meet' />
				<g className='mw-badge' transform={`translate(${n.x + 27}, ${n.y - 27})`}>
					<circle r={16} />
					<text textAnchor='middle' dominantBaseline='central'>{n.score}</text>
				</g>
			</g>
		))}
	</svg>
);

const GAME = {
	league: 'NBA',
	status: 'Q4 · 0:48',
	away: { abbr: 'LAL', name: 'Lakers', score: 112, logo: 'https://a.espncdn.com/i/teamlogos/nba/500/lal.png' },
	home: { abbr: 'BOS', name: 'Celtics', score: 110, logo: 'https://a.espncdn.com/i/teamlogos/nba/500/bos.png' },
	power: 92,
};
const SIGNALS = [
	{ name: 'Closeness', value: 27, max: 30, color: '#22c55e' },
	{ name: 'Late-game pressure', value: 25, max: 28, color: ORANGE },
	{ name: 'Momentum', value: 21, max: 28, color: '#3E9BD1' },
	{ name: 'Lead changes', value: 11, max: 18, color: '#F1C40F' },
	{ name: 'Comeback', value: 8, max: 14, color: '#D90368' },
];
const TREND = [58, 62, 61, 69, 72, 79, 85, 92];

const trendOption: EChartsOption = {
	animation: true,
	animationDuration: 1300,
	animationEasing: 'cubicOut',
	grid: { left: 2, right: 2, top: 8, bottom: 4 },
	xAxis: { type: 'category', show: false, boundaryGap: false, data: TREND.map((_, i) => String(i)) },
	yAxis: { type: 'value', show: false, min: 0, max: 100 },
	series: [{
		type: 'line',
		data: TREND,
		smooth: true,
		showSymbol: false,
		lineStyle: { color: ORANGE, width: 3 },
		areaStyle: {
			color: {
				type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
				colorStops: [
					{ offset: 0, color: 'rgba(247,92,3,0.45)' },
					{ offset: 1, color: 'rgba(247,92,3,0)' },
				],
			},
		},
	}],
};

const GameCard = ({ active, chartElRef }: { active: boolean; chartElRef: React.RefObject<HTMLDivElement | null> }) => (
	<div className='mw-card'>
		<div className='mw-card-teams'>
			<div className='mw-team'>
				<img src={GAME.away.logo} alt={GAME.away.name} loading='lazy' />
				<span className='mw-team-abbr'>{GAME.away.abbr}</span>
			</div>
			<div className='mw-team-mid'>
				<span className='mw-team-scores'>{GAME.away.score}<span className='mw-team-dash'>–</span>{GAME.home.score}</span>
				<span className='mw-team-status'><span className='live-dot'></span>{GAME.league} · {GAME.status}</span>
			</div>
			<div className='mw-team'>
				<img src={GAME.home.logo} alt={GAME.home.name} loading='lazy' />
				<span className='mw-team-abbr'>{GAME.home.abbr}</span>
			</div>
		</div>

		<div className='mw-power'>
			<div className='mw-power-num'>{GAME.power}<span>/100</span></div>
			<div className='mw-power-meta'>
				<span className='mw-power-label'>PowerScore</span>
				<div ref={chartElRef} className='mw-chart' />
			</div>
		</div>

		<div className='mw-signals'>
			{SIGNALS.map(s => (
				<div key={s.name} className='mw-signal'>
					<div className='mw-signal-head'>
						<span>{s.name}</span>
						<span className='mw-signal-val' style={{ color: s.color }}>{s.value}</span>
					</div>
					<div className='ps-bar-track'>
						<div className='ps-bar-fill' style={{ background: s.color, width: active ? `${(s.value / s.max) * 100}%` : '0%' }} />
					</div>
				</div>
			))}
		</div>
	</div>
);

const TABS = [
	{ service: 'ESPN', game: 'Lakers @ Celtics', color: '#d50a0a' },
	{ service: 'Peacock', game: 'Eagles @ Cowboys', color: '#7c3aed' },
	{ service: 'MLB.TV', game: 'Yankees @ Astros', color: '#1e56a0' },
	{ service: 'Sportsnet', game: 'Rangers @ Panthers', color: '#e5a00d' },
];
const TAB_ORDER = [2, 1, 3, 0]; // hop around, settle on the best (index 0)

const TabSwitch = ({ activeTab }: { activeTab: number }) => (
	<div className='mw-browser'>
		<div className='mw-browser-bar'>
			<span className='mw-dot' style={{ background: '#ff5f57' }} />
			<span className='mw-dot' style={{ background: '#febc2e' }} />
			<span className='mw-dot' style={{ background: '#28c840' }} />
			<div className='mw-tabs'>
				{TABS.map((t, i) => (
					<div key={t.service} className='mw-tab' data-active={i === activeTab}>
						<span className='mw-tab-fav' style={{ background: t.color }} />
						<span className='mw-tab-title'>{t.service} · {t.game}</span>
						{i === activeTab && <span className='mw-tab-flag'>ArenaSwap</span>}
					</div>
				))}
			</div>
		</div>
		<div className='mw-browser-body'>
			<img src={`${BASE}/icon_white_on_transparent.png`} alt='' className='mw-browser-mark' />
			<div className='mw-now-label'>Now watching</div>
			<div className='mw-now-game'>{TABS[activeTab].game}</div>
			<div className='mw-now-on'>on {TABS[activeTab].service}</div>
		</div>
	</div>
);

const MachineScene = () => {
	const [stage, setStage] = useState(0);
	const [activeTab, setActiveTab] = useState(TAB_ORDER[TAB_ORDER.length - 1]);
	const [reduced, setReduced] = useState(false);
	const [paused, setPaused] = useState(false);
	const rootRef = useRef<HTMLDivElement>(null);
	const chartElRef = useRef<HTMLDivElement>(null);
	const chartRef = useRef<echarts.EChartsType | null>(null);

	useEffect(() => {
		const isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		setReduced(isReduced);
		const section = rootRef.current?.closest('.machine-section');
		if (isReduced) section?.classList.add('is-reduced');
		else section?.classList.add('is-live');
	}, []);

	useEffect(() => {
		const onVis = () => setPaused(document.hidden);
		document.addEventListener('visibilitychange', onVis);
		return () => document.removeEventListener('visibilitychange', onVis);
	}, []);

	useEffect(() => {
		if (reduced || paused) return;
		const id = window.setTimeout(() => setStage(s => (s + 1) % SCENES), DURATIONS[stage]);
		return () => window.clearTimeout(id);
	}, [stage, reduced, paused]);

	useEffect(() => {
		if (reduced || stage !== 3) return;
		let i = 0;
		setActiveTab(TAB_ORDER[0]);
		const id = window.setInterval(() => {
			i += 1;
			if (i >= TAB_ORDER.length) { window.clearInterval(id); return; }
			setActiveTab(TAB_ORDER[i]);
		}, 1700);
		return () => window.clearInterval(id);
	}, [stage, reduced]);

	useEffect(() => {
		if (reduced || !chartElRef.current) return;
		const chart = chartRef.current ?? echarts.init(chartElRef.current, undefined, { renderer: 'canvas' });
		chartRef.current = chart;
		const onResize = () => chart.resize();
		window.addEventListener('resize', onResize);
		return () => window.removeEventListener('resize', onResize);
	}, [reduced]);

	useEffect(() => {
		if (stage === 2) chartRef.current?.setOption(trendOption, true);
	}, [stage]);

	useEffect(() => () => { chartRef.current?.dispose(); chartRef.current = null; }, []);

	return (
		<div ref={rootRef} className='machine-viewport'>
			<div className='machine-stage-area'>
				<div className='machine-scene' data-active={stage <= 1}>
					<NetworkScene showScores={stage === 1} />
				</div>

				<div className='machine-scene machine-scene-center' data-active={stage === 2}>
					<GameCard active={stage === 2} chartElRef={chartElRef} />
				</div>

				<div className='machine-scene machine-scene-center' data-active={stage === 3}>
					<TabSwitch activeTab={activeTab} />
				</div>
			</div>

			<p className='machine-caption'>
				{CAPTIONS.map((c, i) => (
					<span key={c} className='machine-caption-line' data-active={i === stage}>{c}<span className='as-dot'>.</span></span>
				))}
			</p>

			<div className='machine-progress' aria-hidden='true'>
				{Array.from({ length: SCENES }).map((_, i) => (
					<span key={i} className='machine-pip' data-active={i === stage} />
				))}
			</div>
		</div>
	);
};

export default MachineScene;
