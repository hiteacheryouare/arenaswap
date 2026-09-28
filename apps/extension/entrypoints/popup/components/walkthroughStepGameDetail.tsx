import { useState } from 'react';
import type { CSSProperties } from 'react';
import { i18n } from '#i18n';
import { resolveLeagueLogoUrl } from '@arenaswap/core/constants';
import GameStage from '@arenaswap/ui/src/components/gameStage';
import { signalMeta } from './walkthroughStepPowerScore';
import WalkthroughFrame from './walkthroughFrame';
import { eaglesGiantsQ4 } from './walkthroughMocks';

interface walkthroughStepGameDetailProps {
	onNext: () => void;
	onBack: () => void;
}

const mockPower = 71;

const breakdown = [
	{ labelKey: 'stepGameDetail.signalCloseness', value: 18 },
	{ labelKey: 'stepGameDetail.signalLateGame', value: 22 },
	{ labelKey: 'stepGameDetail.signalMomentum', value: 14 },
	{ labelKey: 'stepGameDetail.signalLeadChanges', value: 9 },
	{ labelKey: 'stepGameDetail.signalComeback', value: 8 },
] as const;

const walkthroughStepGameDetail = ({ onNext, onBack }: walkthroughStepGameDetailProps) => {
	const [opened, setOpened] = useState(false);
	const open = () => setOpened(true);

	return (
		<WalkthroughFrame
			step={6}
			stepLabel={i18n.t('stepGameDetail.step', [6, 8])}
			title={i18n.t('stepGameDetail.title')}
			lede={i18n.t('stepGameDetail.subtitle')}
			backLabel={i18n.t('stepGameDetail.back')}
			onBack={onBack}
			nextLabel={i18n.t('stepGameDetail.next')}
			onNext={onNext}
		>
			{opened ? (
				<div className='wt-detail'>
					<GameStage
						game={eaglesGiantsQ4}
						className='wt-stage wt-hero'
						names='name'
						records={{ away: eaglesGiantsQ4.awayTeam.record, home: eaglesGiantsQ4.homeTeam.record }}
						power={{ value: mockPower, label: i18n.t('gameCard.powerScore') }}
						head={(
							<div className='wt-hero-bar'>
								<button type='button' className='as-icon' aria-label={i18n.t('app.backToGames')} onClick={() => setOpened(false)}>
									<i className='bi bi-arrow-left' aria-hidden='true' />
								</button>
								<span className='wt-hero-league'>
									<img src={resolveLeagueLogoUrl('nfl', undefined, 'light')} alt='' />
									NFL
								</span>
							</div>
						)}
					/>
					<section className='wt-card wt-breakdown' aria-labelledby='wt-breakdown-title'>
						<h3 id='wt-breakdown-title'>{i18n.t('stepGameDetail.detailPreviewTitle')}</h3>
						<div className='wt-signals'>
							{breakdown.map((entry, index) => {
								const signal = signalMeta[index]!;
								return (
									<div key={entry.labelKey} className='wt-signal' style={{ '--signal': signal.color } as CSSProperties}>
										<span className='wt-signal-name'><i aria-hidden='true' />{i18n.t(entry.labelKey)}</span>
										<span className='wt-bar' role='progressbar' aria-label={i18n.t(entry.labelKey)} aria-valuenow={entry.value} aria-valuemin={0} aria-valuemax={signal.max}>
											<span style={{ width: `${(entry.value / signal.max) * 100}%` }} />
										</span>
										<span className='wt-signal-value num'><b>{entry.value}</b>/{signal.max}</span>
									</div>
								);
							})}
						</div>
						<p className='wt-note'>{i18n.t('stepGameDetail.detailPreviewCaption')}</p>
					</section>
					<p className='wt-body'>{i18n.t('stepGameDetail.bodyAfterTap')}</p>
				</div>
			) : (
				<>
					<GameStage
						game={eaglesGiantsQ4}
						className='wt-stage'
						power={{ value: mockPower, label: i18n.t('gameCard.powerScore') }}
						note={(
							<span className='wt-tap'>
								<i className='bi bi-hand-index-thumb' aria-hidden='true' />
								{i18n.t('stepGameDetail.tapHint')}
							</span>
						)}
						interactive={{
							role: 'button',
							tabIndex: 0,
							'aria-label': i18n.t('gameCard.openDetails', { away: eaglesGiantsQ4.awayTeam.abbreviation, home: eaglesGiantsQ4.homeTeam.abbreviation }),
							onClick: open,
							onKeyDown: event => {
								if (event.key === 'Enter' || event.key === ' ') {
									event.preventDefault();
									open();
								}
							},
						}}
					/>
					<p className='wt-body'>{i18n.t('stepGameDetail.body')}</p>
				</>
			)}
		</WalkthroughFrame>
	);
};

export default walkthroughStepGameDetail;
