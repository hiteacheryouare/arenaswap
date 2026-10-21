// macOS has no F11: every browser there takes full screen from Control-Command-F.
export const fullScreenKeys = (platform = navigator.platform): string[] => (/mac/i.test(platform) ? ['⌃', '⌘', 'F'] : ['F11']);

export default (platform?: string): string => fullScreenKeys(platform).join('');
