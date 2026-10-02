import { i18n } from '#i18n';

interface gameListHeaderProps {
	isLoading: boolean;
	hasError: boolean;
	loadingMessage: string;
	onRefresh: () => void;
}

const gameListHeader = ({ isLoading, hasError, loadingMessage, onRefresh }: gameListHeaderProps) => {
	if (isLoading) {
		return (
			<div className='d-flex flex-column justify-content-center align-items-center mt-4 popup-loading-wrap'>
				<div className='spinner-border popup-loading-spinner' role='status'>
					<span className='visually-hidden'>{i18n.t('gameListHeader.loading')}</span>
				</div>
				<div className='mt-2 text-center popup-loading-text'>{loadingMessage}</div>
			</div>
		);
	}

	if (hasError) {
		return (
			<div className='alert popup-notice d-flex align-items-center gap-2 popup-error-banner' role='alert'>
				<i className='bi bi-exclamation-triangle popup-notice-icon popup-notice-icon-danger' aria-hidden='true' />
				<div className='flex-grow-1 min-w-0'>{i18n.t('gameListHeader.loadFailed')}</div>
				<button type='button' className='btn btn-sm btn-primary py-0 px-2 popup-notice-action' onClick={onRefresh}>{i18n.t('gameListHeader.retry')}</button>
			</div>
		);
	}

	return null;
};

export default gameListHeader;
