import { useRef, useState } from 'react';
import { i18n } from '#i18n';
import { leagueConfigMap } from '@arenaswap/core/constants';
import type { LeagueId, LeagueLogoMap } from '@arenaswap/core/types';
import LeagueLogo from './leagueLogo';
import { leagueOrder } from '../popupHelpers';

interface leagueOrderListProps {
	order: LeagueId[];
	leagueLogos: LeagueLogoMap;
	disabled: boolean;
	onReorder: (fromIndex: number, toIndex: number) => void;
	onReset: () => void;
}

const isDefaultOrder = (order: LeagueId[]): boolean => {
	const sorted = order.toSorted((a, b) => (leagueOrder[a] ?? 99) - (leagueOrder[b] ?? 99));
	return sorted.every((id, index) => id === order[index]);
};

const LeagueOrderList = ({ order, leagueLogos, disabled, onReorder, onReset }: leagueOrderListProps) => {
	const dragIndexRef = useRef<number | null>(null);
	const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
	const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

	// Nothing to rearrange with fewer than two leagues.
	if (order.length < 2) return null;

	const clearDragState = () => {
		dragIndexRef.current = null;
		setDraggingIndex(null);
		setDragOverIndex(null);
	};

	const handleDrop = (toIndex: number) => {
		const fromIndex = dragIndexRef.current;
		clearDragState();
		if (fromIndex === null || fromIndex === toIndex) return;
		onReorder(fromIndex, toIndex);
	};

	return (
		<div className='league-order-list mb-3'>
			{order.map((leagueId, index) => {
				const league = leagueConfigMap[leagueId];
				if (!league) return null;
				const rowClasses = [
					'league-order-row',
					draggingIndex === index ? 'is-dragging' : '',
					dragOverIndex === index && draggingIndex !== index ? 'is-drag-over' : '',
				].filter(Boolean).join(' ');
				return (
					<div
						key={leagueId}
						className={rowClasses}
						draggable={!disabled}
						onDragStart={event => {
							dragIndexRef.current = index;
							setDraggingIndex(index);
							event.dataTransfer.effectAllowed = 'move';
						}}
						onDragOver={event => {
							if (dragIndexRef.current === null) return;
							event.preventDefault();
							event.dataTransfer.dropEffect = 'move';
							setDragOverIndex(index);
						}}
						onDrop={event => {
							event.preventDefault();
							handleDrop(index);
						}}
						onDragEnd={clearDragState}
					>
						<i className='bi bi-grip-vertical league-order-handle' aria-hidden='true' title={i18n.t('setup.leagueDragHandle')} />
						<LeagueLogo league={league} logos={leagueLogos} />
						<span className='league-order-label fw-semibold text-body'>{league.label}</span>
						<button
							type='button'
							id={`league-order-up-${leagueId}`}
							className='btn btn-sm btn-link league-order-move-btn'
							onClick={() => onReorder(index, index - 1)}
							disabled={disabled || index === 0}
							aria-label={i18n.t('setup.leagueMoveUp', { label: league.label })}
						>
							<i className='bi bi-arrow-up' aria-hidden='true' />
						</button>
						<button
							type='button'
							id={`league-order-down-${leagueId}`}
							className='btn btn-sm btn-link league-order-move-btn'
							onClick={() => onReorder(index, index + 1)}
							disabled={disabled || index === order.length - 1}
							aria-label={i18n.t('setup.leagueMoveDown', { label: league.label })}
						>
							<i className='bi bi-arrow-down' aria-hidden='true' />
						</button>
					</div>
				);
			})}
			{!isDefaultOrder(order) && (
				<button
					type='button'
					id='leagueOrderReset'
					className='btn btn-sm btn-link league-order-reset'
					onClick={onReset}
					disabled={disabled}
				>
					<i className='bi bi-arrow-counterclockwise me-1' aria-hidden='true' />
					{i18n.t('setup.leagueOrderReset')}
				</button>
			)}
		</div>
	);
};

export default LeagueOrderList;
