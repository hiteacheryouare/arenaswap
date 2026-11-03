import SelectDropdown from '@arenaswap/ui/src/components/selectDropdown';
import type { selectDropdownProps } from '@arenaswap/ui/src/components/selectDropdown';
import attachMenu from '../bootstrapMenu';

export type { selectDropdownOption } from '@arenaswap/ui/src/components/selectDropdown';

const selectDropdown = <T extends string>(props: Omit<selectDropdownProps<T>, 'attach' | 'open'>) => (
	<SelectDropdown {...props} attach={attachMenu} />
);

export default selectDropdown;
