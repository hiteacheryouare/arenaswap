import { useDisplayLocale } from './i18nContext';

interface loadingMessageProps {
	message: string;
	label: string;
	progress?: number;
}

const loadingMessage = ({ message, label, progress }: loadingMessageProps) => {
	const locale = useDisplayLocale();
	const percent = Math.round(progress ?? 0);

	return (
		<div className='d-flex flex-column justify-content-center align-items-center mt-7 popup-loading-wrap'>
			{progress === undefined
				? (
					<div className='spinner-border popup-loading-spinner' role='status'>
						<span className='visually-hidden'>{label}</span>
					</div>
				)
				: (
					<>
						<div className='spinner-border popup-loading-spinner' aria-hidden='true' />
						<div className='d-flex align-items-center gap-2 w-75 mt-3 popup-loading-meter'>
							<div
								className='progress flex-grow-1 popup-loading-progress'
								role='progressbar'
								aria-label={label}
								aria-valuenow={percent}
								aria-valuemin={0}
								aria-valuemax={100}
							>
								<div className='progress-bar' style={{ width: `${progress}%` }} />
							</div>
							<span className='flex-shrink-0 popup-loading-percent' aria-hidden='true'>
								{(percent / 100).toLocaleString(locale, { style: 'percent' })}
							</span>
						</div>
					</>
				)}
			<div className='mt-3 text-center popup-loading-text'>{message}</div>
		</div>
	);
};

export default loadingMessage;
