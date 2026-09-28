import { useMemo, useState } from 'react';

const installCommands = [
	{ id: 'npm', label: 'npm', command: 'npm install powerscore', icon: 'bi-box' },
	{ id: 'yarn', label: 'yarn', command: 'yarn add powerscore', icon: 'bi-terminal' },
	{ id: 'pnpm', label: 'pnpm', command: 'pnpm add powerscore', icon: 'bi-boxes' },
	{ id: 'bun', label: 'bun', command: 'bun add powerscore', icon: 'bi-lightning-charge' },
];

interface Props {
	copyLabel: string;
	copiedLabel: string;
}

// The package manager names are not translated: they are the commands you type.
const PowerScoreInstallCommands = ({ copyLabel, copiedLabel }: Props) => {
	const [activeId, setActiveId] = useState(installCommands[0]?.id ?? 'npm');
	const [copied, setCopied] = useState(false);

	const activeCommand = useMemo(
		() => installCommands.find(item => item.id === activeId) ?? installCommands[0],
		[activeId]
	);

	const copyCommand = async () => {
		if (!activeCommand) return;
		try {
			await navigator.clipboard.writeText(activeCommand.command);
			setCopied(true);
			setTimeout(() => setCopied(false), 1500);
		} catch {
			setCopied(false);
		}
	};

	return (
		<div className='ps-install'>
			<div className='nav nav-underline'>
				{installCommands.map(item => (
					<button
						key={item.id}
						type='button'
						className={`nav-link${activeId === item.id ? ' active' : ''}`}
						aria-pressed={activeId === item.id}
						onClick={() => setActiveId(item.id)}
					>
						<i className={`bi ${item.icon}`} aria-hidden='true'></i>
						{item.label}
					</button>
				))}
			</div>
			<div className='ps-install-command'>
				<code>{activeCommand?.command}</code>
				<button type='button' className='btn btn-quiet btn-sm' onClick={copyCommand}>
					<i className={`bi ${copied ? 'bi-check2' : 'bi-clipboard'} me-2`} aria-hidden='true'></i>
					{copied ? copiedLabel : copyLabel}
				</button>
			</div>
		</div>
	);
};

export default PowerScoreInstallCommands;
