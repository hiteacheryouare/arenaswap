declare module 'canvas-confetti' {
	interface confettiOrigin {
		x?: number;
		y?: number;
	}

	interface confettiOptions {
		particleCount?: number;
		spread?: number;
		startVelocity?: number;
		decay?: number;
		gravity?: number;
		drift?: number;
		scalar?: number;
		ticks?: number;
		colors?: string[];
		origin?: confettiOrigin;
		zIndex?: number;
		disableForReducedMotion?: boolean;
	}

	interface confettiGlobalOptions {
		resize?: boolean;
		useWorker?: boolean;
	}

	interface confettiInstance {
		(options?: confettiOptions): Promise<null> | null;
		reset: () => void;
	}

	interface confettiApi extends confettiInstance {
		create: (canvas: HTMLCanvasElement, options?: confettiGlobalOptions) => confettiInstance;
	}

	const confetti: confettiApi;

	export type {
		confettiOptions,
		confettiGlobalOptions,
		confettiInstance,
	};

	export default confetti;
}
