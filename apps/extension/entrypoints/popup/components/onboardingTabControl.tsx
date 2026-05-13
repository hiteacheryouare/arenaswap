interface onboardingTabControlProps {
	onNext: () => void;
}

const onboardingTabControl = ({ onNext }: onboardingTabControlProps) => (
	<div className='popup-container d-flex flex-column'>

		<div className='onb-logo-wrap d-flex justify-content-center pt-4 pb-3'>
			<img
				src='/images/full_logo_white_on_transparent.png'
				alt='ArenaSwap'
				className='w-[9rem]'
			/>
		</div>

		<div className='onb-content-wrap d-flex flex-column grow'>
			<div className='small text-body-secondary text-uppercase text-center mb-3'>Step 1 of 3</div>

			<div className='fw-bold lh-sm mb-2 fs-4 text-center'>Welcome to ArenaSwap</div>
			<div className='text-body-secondary fs-6 text-center mb-4 lh-base'>
				Before we set things up, here's what to expect.
			</div>

			<div className='d-flex flex-column gap-3 mb-4'>
				<div className='d-flex gap-3 align-items-start'>
					<i className='bi bi-tv fs-5 text-primary shrink-0 mt-1' />
					<div>
						<div className='fw-semibold text-body lh-sm small'>Automatic tab switching</div>
						<div className='setting-explainer mt-1'>
							ArenaSwap takes over the browser window when active. When a game heats up, ArenaSwap activates that tab even if you're watching something else.
						</div>
					</div>
				</div>

				<div className='d-flex gap-3 align-items-start'>
					<i className='bi bi-collection-play fs-5 text-primary shrink-0 mt-1' />
					<div>
						<div className='fw-semibold text-body lh-sm small'>You register tabs to games</div>
						<div className='setting-explainer mt-1'>
							Open each stream in its own tab, then assign it to a game from the extension. ArenaSwap only touches tabs you've registered.
						</div>
					</div>
				</div>

				<div className='d-flex gap-3 align-items-start'>
					<i className='bi bi-sliders fs-5 text-primary shrink-0 mt-1' />
					<div>
						<div className='fw-semibold text-body lh-sm small'>You stay in control</div>
						<div className='setting-explainer mt-1'>
							Pause auto-switching anytime. Tune sensitivity and cooldown from Settings.
						</div>
					</div>
				</div>
			</div>

			<button className='btn btn-primary w-100 mt-auto' onClick={onNext}>
				Got it <i className='bi bi-arrow-right' />
			</button>
		</div>
	</div>
);

export default onboardingTabControl;
