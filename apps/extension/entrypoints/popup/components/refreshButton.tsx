import { useState } from 'react';

interface refreshButtonProps {
	label: string;
	className: string;
	onRefresh: () => unknown;
}

// Holds its width while the request runs: the label stays in the flow, hidden, under the spinner.
const refreshButton = ({ label, className, onRefresh }: refreshButtonProps) => {
	const [pending, setPending] = useState(false);

	const refresh = async () => {
		setPending(true);
		try {
			await onRefresh();
		} finally {
			setPending(false);
		}
	};

	return (
		<button type='button' className={`${className} refresh-button`} onClick={() => void refresh()} disabled={pending} aria-busy={pending}>
			<span className={pending ? 'invisible' : undefined}>{label}</span>
			{pending && <span className='spinner-border refresh-button-spinner' aria-hidden='true' />}
		</button>
	);
};

export default refreshButton;
