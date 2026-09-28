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
			<div className='as-loading popup-loading-wrap'>
				<div className='spinner-border popup-loading-spinner' role='status'>
					<span className='visually-hidden'>{i18n.t('gameListHeader.loading')}</span>
				</div>
				<div className='popup-loading-text'>{loadingMessage}</div>
			</div>
		);
	}

	if (hasError) {
		return (
			<div className='as-notice is-danger popup-error-banner' role='alert'>
				<i className='bi bi-exclamation-triangle as-notice-icon' aria-hidden='true' />
				<div className='as-notice-body'>
					<span className='as-notice-title'>{i18n.t('gameListHeader.loadFailed')}</span>
					<div className='as-notice-actions'>
						<button type='button' className='btn btn-quiet popup-error-retry' onClick={onRefresh}>{i18n.t('gameListHeader.retry')}</button>
					</div>
				</div>
			</div>
		);
	}

	return null;
};

export default gameListHeader;
