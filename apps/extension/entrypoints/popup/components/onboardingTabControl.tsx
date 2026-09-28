import { i18n } from '#i18n';
import Wordmark from '@arenaswap/ui/src/components/wordmark';
import OnboardingStep from './onboardingStep';

interface onboardingTabControlProps {
	onNext: () => void;
}

const points = [
	{ icon: 'bi-tv', title: 'tabControl.feature1Title', body: 'tabControl.feature1Body' },
	{ icon: 'bi-collection-play', title: 'tabControl.feature2Title', body: 'tabControl.feature2Body' },
	{ icon: 'bi-sliders', title: 'tabControl.feature3Title', body: 'tabControl.feature3Body' },
] as const;

const onboardingTabControl = ({ onNext }: onboardingTabControlProps) => (
	<OnboardingStep
		step={1}
		total={3}
		className='ob-welcome'
		footer={<button type='button' className='btn btn-primary' onClick={onNext}>{i18n.t('tabControl.gotIt')}</button>}
	>
		<div className='ob-rise'>
			<Wordmark className='ob-wordmark' />
		</div>
		<div className='ob-reveal'>
			<p className='ob-step'>{i18n.t('tabControl.step', [1, 3])}</p>
			<h2 className='ob-title'>{i18n.t('tabControl.title')}</h2>
			<p className='ob-lede'>{i18n.t('tabControl.subtitle')}</p>
			<ul className='ob-points'>
				{points.map(point => (
					<li key={point.icon}>
						<i className={`bi ${point.icon}`} aria-hidden='true' />
						<div>
							<b>{i18n.t(point.title)}</b>
							<p>{i18n.t(point.body)}</p>
						</div>
					</li>
				))}
			</ul>
		</div>
	</OnboardingStep>
);

export default onboardingTabControl;
