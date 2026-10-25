import Tooltip from 'bootstrap/js/dist/tooltip.js';
import { useEffect, useRef } from 'react';
import { i18n } from '#i18n';

interface settingTooltipIconProps {
	text: string;
	// The setting the explainer is about, so the button reads "About Switch cooldown" rather than
	// the whole explainer, which Bootstrap also hangs on it as a description.
	label?: string;
}

const SettingTooltipIcon = ({ text, label }: settingTooltipIconProps) => {
	const btnRef = useRef<HTMLButtonElement>(null);

	useEffect(() => {
		if (!btnRef.current) return;
		const tooltip = new Tooltip(btnRef.current, {
			title: text,
			placement: 'auto',
			trigger: 'hover focus',
			container: 'body',
		});
		return () => tooltip.dispose();
	}, [text]);

	return (
		<button
			ref={btnRef}
			type='button'
			className='setting-tooltip-btn'
			aria-label={label ? i18n.t('setup.aboutSetting', { setting: label }) : i18n.t('setup.moreInfo')}
		>
			<i className='bi bi-question-circle' aria-hidden='true' />
		</button>
	);
};

export default SettingTooltipIcon;
