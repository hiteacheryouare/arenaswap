import { useState, type ReactNode } from 'react';
import NoticeReveal from '../../../entrypoints/popup/components/noticeReveal';
import ToastContainer from '../../../entrypoints/popup/components/toastContainer';
import useToast from '../../../entrypoints/popup/useToast';

const emulateReducedMotion = (on: boolean) => Cypress.automation('remote:debugger:protocol', {
	command: 'Emulation.setEmulatedMedia',
	params: { features: on ? [{ name: 'prefers-reduced-motion', value: 'reduce' }] : [] },
});

const notice = (text: string) => <div className='alert popup-notice' data-testid='notice'>{text}</div>;

// `rerender` mounts afresh, so a notice changing its mind is driven from inside the tree instead.
const NoticeHarness = ({ start, animate = true, content }: { start: boolean; animate?: boolean; content: (show: boolean) => ReactNode }) => {
	const [show, setShow] = useState(start);
	return (
		<div>
			<button type='button' onClick={() => setShow(value => !value)}>Toggle</button>
			<NoticeReveal show={show} animate={animate}>{content(show)}</NoticeReveal>
			<p className='m-0'>After</p>
		</div>
	);
};

const toggle = () => cy.contains('button', 'Toggle').click();

describe('notices above the list', () => {
	afterEach(() => {
		cy.wrap(emulateReducedMotion(false));
	});

	it('arrives in place when it lands with the list', () => {
		cy.mount(<NoticeReveal show animate={false}>{notice('Hello')}</NoticeReveal>);
		cy.get('.notice-reveal').should('not.have.class', 'is-entering').and('have.css', 'animation-name', 'none');
	});

	it('folds in when it lands after the list was already drawn', () => {
		cy.mount(<NoticeHarness start={false} content={() => notice('Hello')} />);
		toggle();
		cy.get('.notice-reveal').should('have.class', 'is-entering').and('have.css', 'animation-name', 'noticeFoldIn');
	});

	it('folds the notice that was shown away, then leaves nothing behind', () => {
		cy.mount(<NoticeHarness start content={show => notice(show ? '3 suggestions' : '0 suggestions')} />);
		toggle();
		cy.get('.notice-reveal').should('have.class', 'is-leaving').and('have.attr', 'inert');
		cy.get('[data-testid="notice"]').should('have.text', '3 suggestions');
		cy.get('.notice-reveal').should('not.exist');
	});

	it('ends up with no height or margin once folded', () => {
		cy.mount(<NoticeHarness start content={() => notice('Hello')} />);
		toggle();
		cy.get('.notice-reveal').then(([wrapper]) => {
			const [fold] = wrapper!.getAnimations();
			fold!.pause();
			fold!.currentTime = Number(fold!.effect!.getComputedTiming().endTime);
			expect(wrapper!.getBoundingClientRect().height, 'height').to.be.closeTo(0, 0.5);
			expect(getComputedStyle(wrapper!).marginBottom, 'margin').to.equal('0px');
		});
	});

	it('goes at once while the list is still first appearing', () => {
		cy.mount(<NoticeHarness start animate={false} content={() => notice('Hello')} />);
		toggle();
		cy.get('.notice-reveal').should('not.exist');
	});

	it('only fades under reduced motion', () => {
		cy.wrap(emulateReducedMotion(true));
		cy.mount(<NoticeHarness start content={() => notice('Hello')} />);
		toggle();
		cy.get('.notice-reveal').should('have.css', 'animation-name', 'noticeFadeOut');
	});
});

const ToastHarness = () => {
	const { toasts, showToast, dismissToast, pauseToast, resumeToast } = useToast();
	return (
		<>
			<button type='button' onClick={() => showToast('Settings saved', 'success')}>Show</button>
			<button type='button' onClick={() => showToast('Settings did not save', 'error')}>Fail</button>
			<ToastContainer toasts={toasts} onDismiss={dismissToast} onPause={pauseToast} onResume={resumeToast} />
		</>
	);
};

describe('toasts', () => {
	it('slides away when closed instead of vanishing', () => {
		cy.mount(<ToastHarness />);
		cy.contains('button', 'Show').click();
		cy.get('.toast').should('not.have.class', 'is-leaving');
		cy.get('.toast .btn-close').click();
		cy.get('.toast').should('have.class', 'is-leaving').and('have.css', 'animation-name', 'toastSlideAway');
		cy.get('.toast').should('not.exist');
	});

	it('slides away on its own once it has been read', () => {
		cy.clock();
		cy.mount(<ToastHarness />);
		cy.contains('button', 'Show').click();
		cy.tick(3000);
		cy.get('.toast').should('have.class', 'is-leaving');
		cy.tick(200);
		cy.get('.toast').should('not.exist');
	});

	it('announces success politely and errors assertively', () => {
		cy.mount(<ToastHarness />);
		cy.contains('button', 'Show').click();
		cy.get('.toast').should('have.attr', 'role', 'status').and('have.attr', 'aria-live', 'polite');
		cy.contains('button', 'Fail').click();
		cy.contains('.toast', 'did not save').should('have.attr', 'role', 'alert').and('have.attr', 'aria-live', 'assertive');
	});

	it('keeps an error up for 6 seconds', () => {
		cy.clock(Date.now(), ['setTimeout', 'clearTimeout']);
		cy.mount(<ToastHarness />);
		cy.contains('button', 'Fail').click();
		cy.tick(5900);
		cy.get('.toast').should('not.have.class', 'is-leaving');
		cy.tick(100);
		cy.get('.toast').should('have.class', 'is-leaving');
		cy.tick(200);
		cy.get('.toast').should('not.exist');
	});

	it('holds an error while it is hovered and resumes on leave', () => {
		cy.clock(Date.now(), ['setTimeout', 'clearTimeout', 'Date']);
		cy.mount(<ToastHarness />);
		cy.contains('button', 'Fail').click();
		cy.tick(4000);
		cy.get('.toast').trigger('mouseover').trigger('mouseenter');
		cy.tick(10000);
		cy.get('.toast').should('not.have.class', 'is-leaving');
		cy.get('.toast').trigger('mouseout').trigger('mouseleave');
		cy.tick(1900);
		cy.get('.toast').should('not.have.class', 'is-leaving');
		cy.tick(100);
		cy.get('.toast').should('have.class', 'is-leaving');
	});

	it('holds an error while focused and resumes on blur', () => {
		cy.clock(Date.now(), ['setTimeout', 'clearTimeout', 'Date']);
		cy.mount(<ToastHarness />);
		cy.contains('button', 'Fail').click();
		cy.tick(5000);
		cy.get('.toast .btn-close').focus();
		cy.tick(10000);
		cy.get('.toast').should('not.have.class', 'is-leaving');
		cy.get('.toast .btn-close').blur();
		cy.tick(1000);
		cy.get('.toast').should('have.class', 'is-leaving');
	});

	it('does not hold a success toast on hover', () => {
		cy.clock(Date.now(), ['setTimeout', 'clearTimeout', 'Date']);
		cy.mount(<ToastHarness />);
		cy.contains('button', 'Show').click();
		cy.get('.toast').trigger('mouseover').trigger('mouseenter');
		cy.tick(3000);
		cy.get('.toast').should('have.class', 'is-leaving');
	});
});
