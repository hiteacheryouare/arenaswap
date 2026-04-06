import { useState } from 'react';
import type { Browser } from 'wxt/browser';
import { LEAGUE_CONFIG_MAP, SCORE_MAX_TOTAL } from '@arenaswap/core/constants';
import type { ExcitementResult, Game, TabRegistration, Team } from '@arenaswap/core/types';
import TabAssignSelect from './TabAssignSelect';

interface Props {
    game: Game | undefined;
    excitementResult: ExcitementResult | undefined;
    openTabs: Browser.tabs.Tab[];
    registry: TabRegistration[];
    onRegistryChange: (updated: TabRegistration[]) => void;
    formatTabLabel: (tab: Browser.tabs.Tab) => string;
}

const formatPeriod = (game: Game): string => {
    const config = LEAGUE_CONFIG_MAP[game.league];
    const regular = config.regularPeriods;
    const period = game.period;
    if (period > regular) {
        if (config.periodFormat === 'periods') return 'OT';
        return `OT${period - regular}`;
    }
    if (config.periodFormat === 'halves') return period === 1 ? '1H' : '2H';
    if (config.periodFormat === 'periods') return `P${period}`;
    if (config.periodFormat === 'innings') return `Inn ${period}`;
    return `Q${period}`;
};

const formatClock = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = String(seconds % 60).padStart(2, '0');
    return `${m}:${s}`;
};

const formatStartTime = (iso: string): string => {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};

const powerScoreColor = (score: number, max: number): string => {
    const ratio = Math.min(score / max, 1);
    const r = Math.round(139 + (247 - 139) * ratio);
    const g = Math.round(148 + (92 - 148) * ratio);
    const b = Math.round(158 + (3 - 158) * ratio);
    return `rgb(${r},${g},${b})`;
};

/** Opacity applied to each team's color tint on the card background. */
const TEAM_COLOR_OPACITY = 0.09;

/** Convert a CSS hex color (e.g. "#002B5C") to an "r, g, b" string for use in rgba(). */
const hexToRgbComponents = (hex: string): string | null => {
    const clean = hex.replace('#', '');
    if (!/^[0-9a-fA-F]{6}$/.test(clean)) return null;
    const r = parseInt(clean.substring(0, 2), 16);
    const g = parseInt(clean.substring(2, 4), 16);
    const b = parseInt(clean.substring(4, 6), 16);
    return `${r}, ${g}, ${b}`;
};

/**
 * Builds a subtle left-to-right background gradient tinted with each team's
 * primary color.  Opacity is kept low so the white card background shows through.
 */
const teamColorBackground = (awayColor?: string, homeColor?: string): string => {
    const leftRgb  = awayColor ? hexToRgbComponents(awayColor) : null;
    const rightRgb = homeColor ? hexToRgbComponents(homeColor) : null;
    const leftStop  = leftRgb  ? `rgba(${leftRgb}, ${TEAM_COLOR_OPACITY}) 0%`   : '#ffffff 0%';
    const rightStop = rightRgb ? `rgba(${rightRgb}, ${TEAM_COLOR_OPACITY}) 100%` : '#ffffff 100%';
    return `linear-gradient(to right, ${leftStop}, #ffffff 38%, #ffffff 62%, ${rightStop})`;
};

const LOGO_SIZE = 56;

const TeamLogo = ({ team }: { team: Team }) => {
    const [failed, setFailed] = useState(false);

    if (team.logo && !failed) {
        return (
            <img
                src={team.logo}
                alt={team.abbreviation}
                width={LOGO_SIZE}
                height={LOGO_SIZE}
                onError={() => setFailed(true)}
                className='object-fit-contain flex-shrink-0'
            />
        );
    }

    return (
        <div
            className='d-flex align-items-center justify-content-center bg-light rounded-circle flex-shrink-0 fw-bold text-body-secondary'
            style={{ width: LOGO_SIZE, height: LOGO_SIZE, fontSize: '0.7rem' }}
        >
            {team.abbreviation.slice(0, 3)}
        </div>
    );
};

const TeamColumn = ({ team }: { team: Team }) => (
    <div className='d-flex flex-column align-items-center gap-1' style={{ minWidth: 60 }}>
        <TeamLogo team={team} />
        <span className='fw-bold text-center text-nowrap' style={{ fontSize: '0.7rem', color: '#111827' }}>
            {team.abbreviation}
        </span>
    </div>
);

const GameCard = ({ game, excitementResult, openTabs, registry, onRegistryChange, formatTabLabel }: Props) => {
    if (!game) return null;

    if (game.status === 'pre') {
        return (
            <div className='game-card' style={{ opacity: 0.85, background: teamColorBackground(game.awayTeam.color, game.homeTeam.color) }}>
                <div className='d-flex align-items-center justify-content-center' style={{ gap: '0.75rem' }}>
                    <TeamColumn team={game.awayTeam} />
                    <div className='d-flex flex-column align-items-center' style={{ minWidth: 80 }}>
                        <span style={{ fontSize: '0.8rem', color: '#8b949e' }}>vs</span>
                        {game.startTime && (
                            <span className='font-lekton text-center text-nowrap' style={{ fontSize: '0.75rem', color: '#F1C40F', marginTop: '0.15rem' }}>
                                {formatStartTime(game.startTime)}
                            </span>
                        )}
                    </div>
                    <TeamColumn team={game.homeTeam} />
                </div>
                {game.venueName && (
                    <div className='text-center mt-1' style={{ fontSize: '0.6rem', color: '#6c757d' }}>
                        {game.venueName}
                    </div>
                )}
                <TabAssignSelect
                    gameId={game.id}
                    openTabs={openTabs}
                    registry={registry}
                    onChange={onRegistryChange}
                    formatTabLabel={formatTabLabel}
                />
            </div>
        );
    }

    const isOt = game.period > LEAGUE_CONFIG_MAP[game.league].regularPeriods;

    return (
        <div className={`game-card${isOt ? ' is-ot' : ''}`} style={{ background: teamColorBackground(game.awayTeam.color, game.homeTeam.color) }}>
            {/* LIVE badge + PowerScore */}
            <div className='d-flex justify-content-between align-items-center mb-1'>
                <div
                    className='d-flex align-items-center gap-1 fw-bold text-uppercase text-primary'
                    style={{ fontSize: '0.65rem', letterSpacing: '0.08em' }}
                >
                    <span className='live-dot' />
                    LIVE
                </div>
                {excitementResult && (
                    <div
                        className='powerscore'
                        style={{ backgroundColor: powerScoreColor(excitementResult.total, SCORE_MAX_TOTAL) }}
                    >
                        PowerScore: {excitementResult.total} / {SCORE_MAX_TOTAL}
                    </div>
                )}
            </div>

            {/* Teams + scores */}
            <div className='d-flex align-items-center justify-content-center' style={{ gap: '0.75rem' }}>
                <TeamColumn team={game.awayTeam} />
                <div className='d-flex flex-column align-items-center' style={{ minWidth: 80 }}>
                    <div className='d-flex align-items-baseline' style={{ gap: '1.25rem' }}>
                        <span className='fw-bold lh-1' style={{ fontSize: '1.75rem', color: '#111827', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
                            {game.awayTeam.score}
                        </span>
                        <span className='fw-bold lh-1' style={{ fontSize: '1.75rem', color: '#111827', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
                            {game.homeTeam.score}
                        </span>
                    </div>
                    {game.sportType !== 'baseball' && (
                        <span className='font-lekton' style={{ fontSize: '0.85rem', color: '#374151', marginTop: '0.15rem' }}>
                            {formatClock(game.clockSeconds)}
                        </span>
                    )}
                    <span className='font-lekton' style={{ fontSize: '0.7rem', color: '#6c757d', marginTop: '0.1rem' }}>
                        {formatPeriod(game)}
                    </span>
                </div>
                <TeamColumn team={game.homeTeam} />
            </div>

            {game.venueName && (
                <div className='text-center mt-1' style={{ fontSize: '0.6rem', color: '#6c757d' }}>
                    {game.venueName}
                </div>
            )}

            <TabAssignSelect
                gameId={game.id}
                openTabs={openTabs}
                registry={registry}
                onChange={onRegistryChange}
                formatTabLabel={formatTabLabel}
            />
        </div>
    );
};

export default GameCard;
