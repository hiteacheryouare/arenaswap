export const playerInitials = (name: string): string => (
	name
		.split(/[\s.]+/)
		.filter(Boolean)
		.slice(0, 2)
		.map(part => part.charAt(0))
		.join('')
		.toUpperCase()
);
