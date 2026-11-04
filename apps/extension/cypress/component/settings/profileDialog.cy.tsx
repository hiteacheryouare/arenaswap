import BackupSyncPage from '../../../entrypoints/popup/components/backupSyncPage';
import { createDefaultUserPreferences } from '@arenaswap/core/constants';

const noop = () => {};

describe('profile dialog', () => {
	it('truncates a long profile name inside the Copy button at 320px', () => {
		const longName = 'W'.repeat(40);
		const profiles = { profiles: [{ id: 'main', name: longName }], activeId: 'main' };
		cy.viewport(320, 700);
		cy.mount(
			<div className='popup-root'>
				<div className='popup-container'>
					<BackupSyncPage prefs={createDefaultUserPreferences()} fantasyRoster={[]} profiles={profiles} profilesBusy={false} profileActions={{ onSwitch: noop, onCreate: noop, onRename: noop, onDelete: noop }} />
				</div>
			</div>,
		);
		cy.get('#profileNew').click();
		cy.get('#profileDialog').should('be.visible');
		cy.get('#profileCopy').should(([button]: JQuery<HTMLElement>) => {
			const label = button.querySelector('.text-truncate') as HTMLElement;
			expect(label.scrollWidth).to.be.greaterThan(label.clientWidth);
			expect(button.getAttribute('title')).to.contain(longName);
			const dialog = button.closest('dialog')!.getBoundingClientRect();
			expect(button.getBoundingClientRect().right).to.be.at.most(dialog.right + 0.5);
		});
	});
});
