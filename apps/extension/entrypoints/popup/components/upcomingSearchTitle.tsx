import { useEffect, useRef, useState } from 'react';
import { i18n } from '#i18n';
import { PopupSectionTitle } from '@arenaswap/ui/src/components/popupChrome';

interface upcomingSearchTitleProps {
	// Null while the field is closed. An open field with nothing typed yet is ''.
	query: string | null;
	onQueryChange: (query: string | null) => void;
	first?: boolean;
}

type searchMotion = 'expanding' | 'collapsing' | null;

const upcomingSearchTitle = ({ query, onQueryChange, first }: upcomingSearchTitleProps) => {
	const open = query !== null;
	const fieldRef = useRef<HTMLLabelElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	const openButtonRef = useRef<HTMLButtonElement>(null);
	// Motion and focus only follow a toggle the user made. Coming back from a game's details remounts
	// this with the field already open, and growing it or grabbing focus then would replay an
	// entrance nobody asked for and scroll the list away from where it was restored to.
	const [motion, setMotion] = useState<searchMotion>(null);
	const focusAfterToggleRef = useRef(false);

	useEffect(() => {
		if (!focusAfterToggleRef.current) return;
		focusAfterToggleRef.current = false;
		(open ? inputRef : openButtonRef).current?.focus();
	}, [open]);

	// The query is let go once the field has folded back into the magnifier, so the whole day returns
	// in one change. Under reduced motion there is no animation to wait for, and it goes at once.
	useEffect(() => {
		if (motion !== 'collapsing') return;
		let cancelled = false;
		const finish = () => {
			if (cancelled) return;
			setMotion(null);
			focusAfterToggleRef.current = true;
			onQueryChange(null);
		};
		const animations = fieldRef.current?.getAnimations() ?? [];
		if (animations.length === 0) finish();
		else void Promise.all(animations.map(animation => animation.finished)).then(finish, () => {});
		return () => {
			cancelled = true;
		};
	}, [motion, onQueryChange]);

	const expand = () => {
		setMotion('expanding');
		focusAfterToggleRef.current = true;
		onQueryChange('');
	};

	const collapse = () => {
		if (motion !== 'collapsing') setMotion('collapsing');
	};

	return (
		<div className={`upcoming-search-title${first ? ' mt-1' : ''}${open && !motion ? ' upcoming-search-settled' : ''}`}>
			{/* The magnifier stays painted under the field rather than leaving with the tap, so the field
			    grows straight out of it and folds straight back into it. */}
			<PopupSectionTitle
				action={(
					<button
						ref={openButtonRef}
						type='button'
						className='btn btn-sm p-0 ms-auto popup-settings-button'
						onClick={expand}
						tabIndex={open ? -1 : undefined}
						aria-hidden={open || undefined}
						title={i18n.t('main.upcomingSearchOpen')}
						aria-label={i18n.t('main.upcomingSearchOpen')}
						data-testid='upcoming-search-open'
					>
						<i className='bi bi-search popup-settings-icon' aria-hidden='true' />
					</button>
				)}
			>
				{i18n.t('main.sectionUpNext')}
			</PopupSectionTitle>
			{open && (
				<label
					ref={fieldRef}
					className={`form-control form-control-sm form-adorn upcoming-search${motion ? ` upcoming-search-${motion}` : ''}`}
					onAnimationEnd={() => {
						if (motion === 'expanding') setMotion(null);
					}}
					data-testid='upcoming-search'
				>
					<span className='form-adorn-icon' aria-hidden='true'><i className='bi bi-search' /></span>
					<input
						ref={inputRef}
						type='search'
						className='form-ghost upcoming-search-input'
						value={query}
						onChange={e => onQueryChange(e.target.value)}
						onKeyDown={e => {
							if (e.key !== 'Escape') return;
							// Left alone, Escape would also close the whole popup.
							e.preventDefault();
							collapse();
						}}
						placeholder={i18n.t('main.upcomingSearchPlaceholder')}
						aria-label={i18n.t('main.upcomingSearchPlaceholder')}
						autoComplete='off'
						data-testid='upcoming-search-input'
					/>
					<button
						type='button'
						className='btn btn-sm p-0 popup-settings-button'
						onClick={collapse}
						title={i18n.t('main.upcomingSearchClose')}
						aria-label={i18n.t('main.upcomingSearchClose')}
						data-testid='upcoming-search-close'
					>
						<i className='bi bi-x-lg' aria-hidden='true' />
					</button>
				</label>
			)}
		</div>
	);
};

export default upcomingSearchTitle;
