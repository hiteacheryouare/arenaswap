import { useMemo, useState } from 'react';

const installCommands = [
	{ id: 'npm', label: 'npm', command: 'npm install powerscore', icon: 'bi-box' },
	{ id: 'yarn', label: 'yarn', command: 'yarn add powerscore', icon: 'bi-terminal' },
	{ id: 'pnpm', label: 'pnpm', command: 'pnpm add powerscore', icon: 'bi-boxes' },
	{ id: 'bun', label: 'bun', command: 'bun add powerscore', icon: 'bi-lightning-charge' },
];

const PowerScoreInstallCommands = () => {
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
			<div className='d-flex flex-wrap gap-2 mb-3'>
				{installCommands.map(item => (
					<button
						key={item.id}
						type='button'
						className={`btn ${activeId === item.id ? 'btn-cta' : 'btn-outline-secondary-custom'} py-2 px-3`}
						onClick={() => setActiveId(item.id)}
					>
						<i className={`bi ${item.icon} me-2`}></i>
						{item.label}
					</button>
				))}
			</div>
			<div
				className='rounded-4 px-3 py-3 d-flex flex-wrap align-items-center justify-content-between gap-3'
				style={{ background: 'rgba(13,17,23,0.9)', border: '1px solid var(--color-border)' }}
			>
				<code className='mb-0 text-[0.92rem] text-[var(--color-text)] font-[var(--font-mono)]'>{activeCommand?.command}</code>
				<button type='button' className='btn btn-cta py-2 px-3' onClick={copyCommand}>
					<i className={`bi ${copied ? 'bi-check2' : 'bi-clipboard'} me-2`}></i>
					{copied ? 'Copied' : 'Copy'}
				</button>
			</div>
		</div>
	);
};

export default PowerScoreInstallCommands;
