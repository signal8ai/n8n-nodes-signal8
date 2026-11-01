import type { INodeProperties } from 'n8n-workflow';

/**
 * Builds the URL path segment for a ticker parameter. The value is trimmed,
 * upper-cased and URL-encoded so a stray space or symbol cannot change the path.
 */
export const tickerPath = (name = 'ticker'): string =>
	`{{encodeURIComponent(String($parameter.${name}).trim().toUpperCase())}}`;

/** Required ticker field shown for the given resource and operation. */
export function tickerField(resource: string, operation: string): INodeProperties {
	return {
		displayName: 'Ticker',
		name: 'ticker',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'AAPL',
		description: 'Stock ticker symbol, for example AAPL. Case-insensitive.',
		displayOptions: { show: { resource: [resource], operation: [operation] } },
	};
}

/**
 * Unwraps the `{ data: ... }` envelope every Signal8 endpoint returns. With a
 * second key, the list stored under `data.<key>` becomes one n8n item per row.
 */
export function unwrap(listKey?: string) {
	const steps: Array<{ type: 'rootProperty'; properties: { property: string } }> = [
		{ type: 'rootProperty', properties: { property: 'data' } },
	];
	if (listKey) {
		steps.push({ type: 'rootProperty', properties: { property: listKey } });
	}
	return { output: { postReceive: steps } };
}
