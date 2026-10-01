import { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts/core';
import { LineChart } from 'echarts/charts';
import { GridComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import type { EChartsOption } from 'echarts';
import {
	scoreMaxCloseness,
	scoreMaxLateGame,
	scoreMaxMomentum,
	scoreMaxLeadChanges,
	scoreMaxComeback,
} from '@arenaswap/core/constants';
import type { Game } from '@arenaswap/core/types';
import GameStage from '@arenaswap/ui/src/components/gameStage';
import { chartEasing, motionDuration } from '@arenaswap/ui/src/motion';
import { TranslationContext, islandTranslator } from '../i18n/islandStrings';

echarts.use([LineChart, GridComponent, CanvasRenderer]);

// Four looping scenes: watch every live game, score each one, open one for the full breakdown,
// land the tab on the best. The opened game is the popup's own stage; the PowerScore trend is a
// real ECharts graph.

const sceneCount = 4;
const sceneDurations = [4200, 4200, 6000, 8200];

// OrangeDots.astro skips React islands, so the orange-dot flourish is applied here instead.
interface Strings {
	alt: string;
	nowWatching: string;
	nowOn: string;
	captions: string[];
	signals: string[];
}

const imageBase = `${import.meta.env.BASE_URL}images`;
const orange = '#F75C03';

// Curated to logos that read clearly on the dark background; dark navy and black crests like
// the NHL and Champions League marks are dropped.
const networkLeagues = [
	{ id: 'nba', s: 88 }, { id: 'nfl', s: 72 }, { id: 'mlb', s: 59 }, { id: 'wnba', s: 80 },
	{ id: 'nhl', s: 64 }, { id: 'mls', s: 62 }, { id: 'laliga', s: 68 },
	{ id: 'bundesliga', s: 74 }, { id: 'ncaaf', s: 66 },
];
const centerX = 480;
const centerY = 360;
const radius = 300;
const nodes = networkLeagues.map((n, i) => {
	const angle = (i / networkLeagues.length) * Math.PI * 2 - Math.PI / 2;
	return {
		id: n.id,
		score: n.s,
		logo: `${imageBase}/leagues/${n.id}.png`,
		x: centerX + radius * Math.cos(angle),
		y: centerY + radius * Math.sin(angle),
	};
});

const NetworkScene = ({ showScores, alt }: { showScores: boolean; alt: string }) => (
	<svg className='mw-net' viewBox='0 0 960 720' data-scores={showScores} role='img' aria-label={alt}>
		{nodes.map((n, i) => (
			<g key={`wire-${n.id}`}>
				<line className='mw-wire-base' x1={n.x} y1={n.y} x2={centerX} y2={centerY} />
				<line className='mw-wire-dot' x1={n.x} y1={n.y} x2={centerX} y2={centerY} style={{ animationDelay: `${(i % 6) * 0.2}s` }} />
			</g>
		))}

		<circle className='mw-core-ring' cx={centerX} cy={centerY} r={60} />
		<image href={`${imageBase}/icon_white_on_transparent.png`} x={centerX - 34} y={centerY - 30} width={68} height={60} preserveAspectRatio='xMidYMid meet' />

		{nodes.map(n => (
			<g key={`node-${n.id}`} className='mw-node'>
				<circle className='mw-chip' cx={n.x} cy={n.y} r={37} />
				<image href={n.logo} x={n.x - 26} y={n.y - 26} width={52} height={52} preserveAspectRatio='xMidYMid meet' />
				<g className='mw-badge' transform={`translate(${n.x}, ${n.y + 62})`}>
					<text textAnchor='middle' dominantBaseline='central'>{n.score}</text>
				</g>
			</g>
		))}
	</svg>
);

const espnTeamLogo = (path: string) => `https://a.espncdn.com/i/teamlogos/${path}.png`;

const demoGame: Game = {
	id: 'machine-nba',
	league: 'nba',
	sportType: 'basketball',
	status: 'in',
	period: 4,
	clockSeconds: 48,
	awayTeam: { id: '13', name: 'Los Angeles Lakers', abbreviation: 'LAL', score: 112, logo: espnTeamLogo('nba/500/lal'), color: '#552583', alternateColor: '#FDB927' },
	homeTeam: { id: '2', name: 'Boston Celtics', abbreviation: 'BOS', score: 110, logo: espnTeamLogo('nba/500/bos'), color: '#007A33', alternateColor: '#BA9653' },
};
const demoPower = 92;
const signalValues = [
	{ value: 30, max: scoreMaxCloseness, color: '#22c55e' },
	{ value: 26, max: scoreMaxLateGame, color: orange },
	{ value: 20, max: scoreMaxMomentum, color: '#2274A5' },
	{ value: 9, max: scoreMaxLeadChanges, color: '#F1C40F' },
	{ value: 7, max: scoreMaxComeback, color: '#D90368' },
];
const trend = [58, 62, 61, 69, 72, 79, 85, 92];

const trendOption: EChartsOption = {
	animation: true,
	animationDuration: motionDuration.epic,
	animationEasing: chartEasing,
	grid: { left: 2, right: 2, top: 8, bottom: 4 },
	xAxis: { type: 'category', show: false, boundaryGap: false, data: trend.map((_, i) => String(i)) },
	yAxis: { type: 'value', show: false, min: 0, max: 100 },
	series: [{
		type: 'line',
		data: trend,
		smooth: true,
		showSymbol: false,
		lineStyle: { color: orange, width: 3 },
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

const GameCard = ({ active, chartElRef, strings }: { active: boolean; chartElRef: React.RefObject<HTMLDivElement | null>; strings: Strings }) => (
	<div className='mw-card'>
		<GameStage game={demoGame} label='NBA' power={demoPower} />
		<div className='mw-breakdown'>
			<div ref={chartElRef} className='mw-chart' />
			<ul className='mw-signals'>
				{signalValues.map((signal, index) => (
					<li key={strings.signals[index]} className='mw-signal'>
						<div className='mw-signal-head'>
							<span>{strings.signals[index]}</span>
							<span className='mw-signal-val num'>{signal.value}</span>
						</div>
						<div className='progress' role='presentation'>
							<div className='progress-bar' style={{ background: signal.color, width: active ? `${(signal.value / signal.max) * 100}%` : '0%' }} />
						</div>
					</li>
				))}
			</ul>
		</div>
	</div>
);

const TABS = [
	{ service: 'NBA League Pass', game: 'Lakers @ Celtics', color: '#1d428a' },
	{ service: 'Peacock', game: 'Eagles @ Cowboys', color: '#7c3aed' },
	{ service: 'MLB.TV', game: 'Yankees @ Astros', color: '#1e56a0' },
	{ service: 'Sportsnet', game: 'Rangers @ Panthers', color: '#e5a00d' },
];
const TAB_ORDER = [2, 1, 3, 0]; // hop around, settle on the best (index 0)

const TabSwitch = ({ activeTab, strings }: { activeTab: number; strings: Strings }) => (
	<div className='mw-browser'>
		<div className='mw-browser-bar'>
			<span className='mw-lights' aria-hidden='true'><i /><i /><i /></span>
			<div className='mw-tabs'>
				{TABS.map((tab, i) => (
					<div key={tab.service} className='mw-tab' data-active={i === activeTab}>
						<span className='mw-tab-fav' style={{ background: tab.color }} />
						<span className='mw-tab-title'>{tab.game}</span>
					</div>
				))}
			</div>
		</div>
		<div className='mw-browser-body'>
			<img src={`${imageBase}/icon_white_on_transparent.png`} alt='' className='mw-browser-mark' />
			<div className='mw-now-label'>{strings.nowWatching}</div>
			<div className='mw-now-game'>{TABS[activeTab].game}</div>
			<div className='mw-now-on'>{strings.nowOn.split('{service}').join(TABS[activeTab].service)}</div>
		</div>
	</div>
);

const MachineStages = ({ strings }: { strings: Strings }) => {
	const [stage, setStage] = useState(0);
	const [activeTab, setActiveTab] = useState(TAB_ORDER[TAB_ORDER.length - 1]);
	const [reduced, setReduced] = useState(false);
	const [paused, setPaused] = useState(false);
	const rootRef = useRef<HTMLDivElement>(null);
	const chartElRef = useRef<HTMLDivElement>(null);
	const chartRef = useRef<echarts.EChartsType | null>(null);

	useEffect(() => {
		const isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		// Astro renders this component on the server, so `window` is out of reach during render
		// and the query can only be read once we are mounted.
		// oxlint-disable-next-line react/set-state-in-effect
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
		const id = window.setTimeout(() => setStage(s => (s + 1) % sceneCount), sceneDurations[stage]);
		return () => window.clearTimeout(id);
	}, [stage, reduced, paused]);

	useEffect(() => {
		if (reduced || stage !== 3) return;
		let i = 0;
		// Seeds the first tab so the interval below only has to advance from it.
		// oxlint-disable-next-line react/set-state-in-effect
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
					<NetworkScene showScores={stage === 1} alt={strings.alt} />
				</div>

				<div className='machine-scene machine-scene-center' data-active={stage === 2}>
					<GameCard active={stage === 2} chartElRef={chartElRef} strings={strings} />
				</div>

				<div className='machine-scene machine-scene-center' data-active={stage === 3}>
					<TabSwitch activeTab={activeTab} strings={strings} />
				</div>
			</div>

			<p className='machine-caption'>
				{strings.captions.map((c, i) => (
					<span key={c} className='machine-caption-line' data-active={i === stage}>{c}<span className='as-dot'>.</span></span>
				))}
			</p>

			<div className='machine-progress' aria-hidden='true'>
				{Array.from({ length: sceneCount }).map((_, i) => (
					<span key={i} className='machine-pip' data-active={i === stage} />
				))}
			</div>
		</div>
	);
};

const MachineScene = ({ strings, uiStrings }: { strings: Strings; uiStrings?: Record<string, string> }) => (
	<TranslationContext.Provider value={islandTranslator(uiStrings)}>
		<MachineStages strings={strings} />
	</TranslationContext.Provider>
);

export default MachineScene;
