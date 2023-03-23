export function throwIfUnset(name: string, value: any) {
	const message = `${name} missing`;

	if (Array.isArray(value) || typeof value === 'string') {
		if (!value.length) {
			throw new Error(message);
		}
	}
	if (!value) {
		throw new Error(message);
	}
}

export function respondToClient(response: any) {
	return new Response(JSON.stringify(response), {
		status: 200,
		headers: {
			'content-type': 'application/json'
		}
	});
}

export function getErrorMessage(error: unknown) {
	return toErrorWithMessage(error).message;
}

type ErrorWithMessage = {
	message: string;
};

function isErrorWithMessage(error: unknown): error is ErrorWithMessage {
	return (
		typeof error === 'object' &&
		error !== null &&
		'message' in error &&
		typeof (error as Record<string, unknown>).message === 'string'
	);
}

function toErrorWithMessage(maybeError: unknown): ErrorWithMessage {
	if (isErrorWithMessage(maybeError)) return maybeError;

	try {
		return new Error(JSON.stringify(maybeError));
	} catch {
		// fallback in case there's an error stringifying the maybeError (e.g. with circular refs)
		return new Error(String(maybeError));
	}
}
