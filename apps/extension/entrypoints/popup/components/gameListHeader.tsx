import { i18n } from '#i18n';
import LoadingMessage from '@arenaswap/ui/src/components/loadingMessage';
import RefreshButton from '@arenaswap/ui/src/components/refreshButton';

interface gameListHeaderProps {
	isLoading: boolean;
	hasError: boolean;
	loadingMessage: string;
	onRefresh: () => unknown;
}

const gameListHeader = ({ isLoading, hasError, loadingMessage, onRefresh }: gameListHeaderProps) => {
	if (isLoading) {
		return <LoadingMessage message={loadingMessage} label={i18n.t('gameListHeader.loading')} />;
	}

	if (hasError) {
		return (
			<div className='alert popup-notice theme-danger align-items-center gap-3 popup-error-banner' role='alert'>
				<i className='bi bi-exclamation-triangle popup-notice-icon flex-shrink-0' aria-hidden='true' />
				<div className='flex-grow-1 min-w-0'>{i18n.t('gameListHeader.loadFailed')}</div>
				<RefreshButton label={i18n.t('gameListHeader.retry')} className='alert-link popup-notice-action flex-shrink-0' onRefresh={onRefresh} />
			</div>
		);
	}

	return null;
};

export default gameListHeader;
