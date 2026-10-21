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
		<div className='feature-card'>
			<div className='d-flex flex-wrap gap-3 mb-5'>
				{installCommands.map(item => (
					<button
						key={item.id}
						type='button'
						className={`btn ${activeId === item.id ? 'btn-cta' : 'btn-outline-secondary-custom'} py-3 px-5`}
						onClick={() => setActiveId(item.id)}
					>
						<i className={`bi ${item.icon} me-3`}></i>
						{item.label}
					</button>
				))}
			</div>
			<div
				className='rounded-4 px-5 py-5 d-flex flex-wrap align-items-center justify-content-between gap-5'
				style={{ background: 'color-mix(in srgb, var(--as-bg-body) 90%, transparent)', border: '1px solid var(--color-border)' }}
			>
				<code className='mb-0 text-[0.92rem] text-[var(--color-text)] font-[var(--font-mono)]'>{activeCommand?.command}</code>
				<button type='button' className='btn btn-cta py-3 px-5' onClick={copyCommand}>
					<i className={`bi ${copied ? 'bi-check2' : 'bi-clipboard'} me-3`}></i>
					{copied ? copiedLabel : copyLabel}
				</button>
			</div>
		</div>
	);
};

export default PowerScoreInstallCommands;
