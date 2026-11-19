interface loadingMessageProps {
	message: string;
	label: string;
}

const loadingMessage = ({ message, label }: loadingMessageProps) => (
	<div className='d-flex flex-column justify-content-center align-items-center mt-7 popup-loading-wrap'>
		<div className='spinner-border popup-loading-spinner' role='status'>
			<span className='visually-hidden'>{label}</span>
		</div>
		<div className='mt-3 text-center popup-loading-text'>{message}</div>
	</div>
);

export default loadingMessage;
