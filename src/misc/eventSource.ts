import { SSE } from 'sse.js';

export class EventSource {
	private eventSource?: SSE;
	private handleAnswer?: (event: MessageEvent<any>) => void;
	private handleError?: (event: MessageEvent<any>) => void;
	private handleAbort?: (event: MessageEvent<any>) => void;

	start(
		url: string,
		payload: any,
		handleAnswer: (event: MessageEvent<any>) => void,
		handleError: (event: MessageEvent<any>) => void,
		handleAbort: (event: MessageEvent<any>) => void,
		token?: string
	) {
		const headers: Record<string, string> = token
			? {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`
				}
			: {
					'Content-Type': 'application/json'
				};
		this.eventSource = new SSE(url, {
			headers,
			payload: JSON.stringify(payload)
		});
		this.handleAnswer = handleAnswer;
		this.handleError = handleError;
		this.handleAbort = handleAbort;

		if (this.handleAnswer) {
			this.eventSource.addEventListener('message', this.handleAnswer);
		}
		if (this.handleError) {
			this.eventSource.addEventListener('error', this.handleError);
		}
		if (this.handleAbort) {
			this.eventSource.addEventListener('abort', this.handleAbort);
		}

		this.eventSource.stream();
	}

	stop() {
		this.eventSource?.close();
		this.reset();
	}

	reset() {
		if (this.handleAnswer) {
			this.eventSource?.removeEventListener('message', this.handleAnswer);
		}
		if (this.handleError) {
			this.eventSource?.removeEventListener('error', this.handleError);
		}
		if (this.handleAbort) {
			this.eventSource?.removeEventListener('abort', this.handleAbort);
		}

		this.eventSource?.close();

		this.eventSource = undefined;
	}
}
