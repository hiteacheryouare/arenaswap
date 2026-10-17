import { useLayoutEffect, useRef, useState } from 'react';
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
	// A row that moves, a button that disables itself at either end and a Reset that removes itself
	// all take keyboard focus down with them, so it is put back once the new order has rendered.
	const pendingFocusRef = useRef<{ leagueId: LeagueId; direction: 'up' | 'down' } | null>(null);

	useLayoutEffect(() => {
		const pending = pendingFocusRef.current;
		if (!pending) return;
		pendingFocusRef.current = null;
		const opposite = pending.direction === 'up' ? 'down' : 'up';
		const preferred = document.getElementById(`league-order-${pending.direction}-${pending.leagueId}`) as HTMLButtonElement | null;
		const target = preferred && !preferred.disabled
			? preferred
			: document.getElementById(`league-order-${opposite}-${pending.leagueId}`);
		target?.focus();
	});

	if (order.length < 2) return null;

	const move = (leagueId: LeagueId, index: number, direction: 'up' | 'down') => {
		pendingFocusRef.current = { leagueId, direction };
		onReorder(index, direction === 'up' ? index - 1 : index + 1);
	};

	const reset = () => {
		const first = order.toSorted((a, b) => (leagueOrder[a] ?? 99) - (leagueOrder[b] ?? 99))[0];
		if (first) pendingFocusRef.current = { leagueId: first, direction: 'down' };
		onReset();
	};

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
		<div className='league-order-list mb-5'>
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
							// Firefox refuses to start a drag with an empty data transfer, and Cypress
							// cannot drive one either.
							event.dataTransfer.setData('text/plain', leagueId);
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
						<span className='league-order-label fw-semibold fg-body'>{league.label}</span>
						<button
							type='button'
							id={`league-order-up-${leagueId}`}
							className='btn btn-sm btn-link league-order-move-btn'
							onClick={() => move(leagueId, index, 'up')}
							disabled={disabled || index === 0}
							aria-label={i18n.t('setup.leagueMoveUp', { label: league.label })}
						>
							<i className='bi bi-arrow-up' aria-hidden='true' />
						</button>
						<button
							type='button'
							id={`league-order-down-${leagueId}`}
							className='btn btn-sm btn-link league-order-move-btn'
							onClick={() => move(leagueId, index, 'down')}
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
					onClick={reset}
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
