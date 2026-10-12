export interface CdpMessage {
	id?: number;
	method?: string;
	params?: any;
	result?: any;
	error?: { message: string };
	sessionId?: string;
}

export interface CdpConnection {
	send: <T = any>(method: string, params?: object) => Promise<T>;
	on: (method: string, handler: (params: any) => void) => () => void;
	once: (method: string) => Promise<any>;
	close: () => void;
}

const connectCdp = async (url: string): Promise<CdpConnection> => {
	const socket = new WebSocket(url);
	await new Promise<void>((resolve, reject) => {
		socket.addEventListener('open', () => resolve(), { once: true });
		socket.addEventListener('error', () => reject(new Error(`Could not reach Chrome at ${url}`)), { once: true });
	});

	let nextId = 0;
	const pending = new Map<number, { resolve: (value: any) => void; reject: (error: Error) => void; method: string }>();
	const handlers = new Map<string, Set<(params: any) => void>>();

	socket.addEventListener('message', event => {
		const message = JSON.parse(String(event.data)) as CdpMessage;
		if (message.id !== undefined) {
			const waiting = pending.get(message.id);
			if (!waiting) return;
			pending.delete(message.id);
			if (message.error) waiting.reject(new Error(`${waiting.method}: ${message.error.message}`));
			else waiting.resolve(message.result);
			return;
		}
		if (message.method) for (const handler of handlers.get(message.method) ?? []) handler(message.params);
	});

	const on = (method: string, handler: (params: any) => void) => {
		const set = handlers.get(method) ?? new Set();
		set.add(handler);
		handlers.set(method, set);
		return () => { set.delete(handler); };
	};

	return {
		send: (method, params = {}) => new Promise((resolve, reject) => {
			const id = ++nextId;
			pending.set(id, { resolve, reject, method });
			socket.send(JSON.stringify({ id, method, params }));
		}),
		on,
		once: method => new Promise(resolve => {
			const off = on(method, params => {
				off();
				resolve(params);
			});
		}),
		close: () => socket.close(),
	};
};

export default connectCdp;
