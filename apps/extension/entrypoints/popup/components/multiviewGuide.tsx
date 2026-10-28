import { useState, type CSSProperties } from 'react';
import { i18n } from '#i18n';
import FlowStepper from './flowStepper';
import focusStepTitle from './stepTitleFocus';

interface multiviewGuideProps {
	// Starts the browser's permission prompt, so it has to run inside the click on Continue.
	onAllow: () => void;
	onNotNow: () => void;
}

const matchups = {
	a: { left: '#008E97', right: '#241773', ground: '#2f6b2f' },
	b: { left: '#125740', right: '#FF3C00', ground: '#356f30' },
	c: { left: '#552583', right: '#1D428A', ground: '#a8703c' },
};

const teamColors = (matchup: keyof typeof matchups) => ({
	'--guide-left': matchups[matchup].left,
	'--guide-right': matchups[matchup].right,
	'--guide-ground': matchups[matchup].ground,
}) as CSSProperties;

// Two games in the list get more exciting, then become Multiview's two boxes.
const StoryMockup = () => (
	<div className='multiview-guide-story' aria-hidden='true'>
		<div className='multiview-guide-story-popup' />
		<div className='multiview-guide-story-screen' />
		{(['a', 'b'] as const).map(matchup => (
			<div key={matchup} className={`multiview-guide-story-card multiview-guide-story-card-${matchup}`} style={teamColors(matchup)}>
				<div className='multiview-guide-story-ground' />
				<span className='multiview-guide-story-score multiview-guide-story-score-before'>{matchup === 'a' ? 54 : 49}</span>
				<span className='multiview-guide-story-score multiview-guide-story-score-after'>{matchup === 'a' ? 81 : 74}</span>
			</div>
		))}
		<i className='bi bi-volume-up-fill multiview-guide-story-sound' />
	</div>
);

// The screen itself: two boxes, a third joins, and the new leader takes the big one.
const GridMockup = () => (
	<div className='multiview-guide-grid' aria-hidden='true'>
		{(['a', 'b', 'c'] as const).map(matchup => (
			<div key={matchup} className={`multiview-guide-box multiview-guide-box-${matchup}`} style={teamColors(matchup)}>
				<div className='multiview-guide-box-face'>
					<div className='multiview-guide-box-bar' />
				</div>
			</div>
		))}
		<div className='multiview-guide-grid-sound'>
			<i className='bi bi-volume-up-fill' />
		</div>
	</div>
);

const Row = ({ icon, title, body }: { icon: string; title: string; body: string }) => (
	<div className='d-flex gap-5 align-items-start'>
		<i className={`bi bi-${icon} fs-lg fg-primary flex-shrink-0 mt-1`} />
		<div>
			<div className='fw-semibold fg-body lh-xs small'>{title}</div>
			<div className='setting-explainer mt-1'>{body}</div>
		</div>
	</div>
);

const multiviewGuide = ({ onAllow, onNotNow }: multiviewGuideProps) => {
	const [step, setStep] = useState<1 | 2>(1);

	return (
		<div className='popup-container d-flex flex-column'>
			<div key={step} className='standby-guide-content d-flex flex-column flex-grow-1'>
				<FlowStepper step={step} total={2} className='justify-content-center mb-5' />

				{step === 1 && (
					<>
						<div className='fw-bold lh-xs mb-2 fs-lg text-center popup-step-title' role='heading' aria-level={1} tabIndex={-1} ref={focusStepTitle} data-step-title>{i18n.t('multiviewGuide.title')}</div>
						<div className='fg-secondary fs-md text-center mb-5 lh-md'>{i18n.t('multiviewGuide.subtitle')}</div>
						<StoryMockup />
						<div className='d-flex flex-column gap-5 mt-5 mb-5'>
							<Row icon='grid-1x2' title={i18n.t('multiviewGuide.oneScreenTitle')} body={i18n.t('multiviewGuide.oneScreenBody')} />
							<Row icon='volume-up' title={i18n.t('multiviewGuide.soundTitle')} body={i18n.t('multiviewGuide.soundBody')} />
							<Row icon='arrow-return-left' title={i18n.t('multiviewGuide.backTitle')} body={i18n.t('multiviewGuide.backBody')} />
						</div>
						<button type='button' className='btn btn-solid theme-primary w-100 mt-auto' onClick={() => setStep(2)}>
							{i18n.t('multiviewGuide.next')} <i className='bi bi-arrow-right' />
						</button>
					</>
				)}

				{step === 2 && (
					<>
						<div className='fw-bold lh-xs mb-5 fs-lg text-center popup-step-title' role='heading' aria-level={1} tabIndex={-1} ref={focusStepTitle} data-step-title>{i18n.t('multiviewGuide.permissionTitle')}</div>
						<GridMockup />
						<div className='d-flex flex-column gap-5 mt-5 mb-5'>
							<Row icon='chat-square-text' title={i18n.t('multiviewGuide.askTitle')} body={i18n.t('multiviewGuide.askBody')} />
							<Row icon='window-stack' title={i18n.t('multiviewGuide.whyTitle')} body={i18n.t('multiviewGuide.whyBody')} />
							<Row icon='x-circle' title={i18n.t('multiviewGuide.noTitle')} body={i18n.t('multiviewGuide.noBody')} />
						</div>
						<div className='d-flex gap-3 mt-auto'>
							<button type='button' className='btn btn-solid theme-accent' onClick={() => setStep(1)} aria-label={i18n.t('multiviewGuide.back')}>
								<i className='bi bi-arrow-left' />
							</button>
							<button type='button' className='btn btn-solid theme-accent flex-grow-1' onClick={onNotNow}>
								{i18n.t('multiviewGuide.notNow')}
							</button>
							<button type='button' id='multiviewGuideAllow' className='btn btn-solid theme-primary flex-grow-1' onClick={onAllow}>
								{i18n.t('multiviewGuide.allow')}
							</button>
						</div>
					</>
				)}
			</div>
		</div>
	);
};

export default multiviewGuide;
