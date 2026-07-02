import { useState } from 'react';
import { i18n } from '#i18n';

type proTipContext = 'main' | 'setup' | 'detail' | 'general';

interface proTipProps {
	context?: proTipContext;
	chance?: number;
}

const tipsByContext: Record<proTipContext, string[]> = {
	general: [
		i18n.t('proTip.general.t0'),
		i18n.t('proTip.general.t1'),
		i18n.t('proTip.general.t2'),
		i18n.t('proTip.general.t3'),
		i18n.t('proTip.general.t4'),
		i18n.t('proTip.general.t5'),
	],
	main: [
		i18n.t('proTip.main.t0'),
		i18n.t('proTip.main.t1'),
		i18n.t('proTip.main.t2'),
		i18n.t('proTip.main.t3'),
		i18n.t('proTip.main.t4'),
	],
	setup: [
		i18n.t('proTip.setup.t0'),
		i18n.t('proTip.setup.t1'),
		i18n.t('proTip.setup.t2'),
		i18n.t('proTip.setup.t3'),
		i18n.t('proTip.setup.t4'),
	],
	detail: [
		i18n.t('proTip.detail.t0'),
		i18n.t('proTip.detail.t1'),
		i18n.t('proTip.detail.t2'),
		i18n.t('proTip.detail.t3'),
		i18n.t('proTip.detail.t4'),
		i18n.t('proTip.detail.t5'),
		i18n.t('proTip.detail.t6'),
	],
};

const pickTip = (context: proTipContext): string | null => {
	const pool = [...tipsByContext.general, ...tipsByContext[context]];
	if (pool.length === 0) return null;
	return pool[Math.floor(Math.random() * pool.length)] ?? null;
};

const proTip = ({ context = 'general', chance = 0.05 }: proTipProps) => {
	const [tip] = useState<string | null>(() => (Math.random() < chance ? pickTip(context) : null));
	if (!tip) return null;
	return (
		<div className="pb-2">
			<div
				className='alert alert-info d-flex align-items-start gap-2 py-2 px-3 mt-2 mb-0 lh-sm dark:bg-blue-950 dark:text-blue-100 dark:border-blue-800'
				role='alert'
			>
				<i className='bi bi-lightbulb-fill shrink-0 mt-1' />
				<div>
					<span className='fw-bold'>{i18n.t('proTip.label')}</span> {tip}
				</div>
			</div>
		</div>
	);
};

export default proTip;
