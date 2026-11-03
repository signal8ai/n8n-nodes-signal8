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

/**
 * Return All + Limit for a list operation, the n8n convention for paging.
 * Return All on: the node follows the API's `offset` itself, `pageSize` rows
 * per request, until a short page comes back. Return All off: one request for
 * up to Limit rows. `maxLimit` is the API's per-request cap for this endpoint.
 */
export function returnAllAndLimit(
	show: Record<string, string[]>,
	maxLimit: number,
	pageSize = 100,
): INodeProperties[] {
	return [
		{
			displayName: 'Return All',
			name: 'returnAll',
			type: 'boolean',
			default: false,
			description: 'Whether to return all results or only up to a given limit',
			displayOptions: { show },
			routing: {
				send: { paginate: '={{ $value }}' },
				operations: {
					pagination: {
						type: 'offset',
						properties: {
							limitParameter: 'limit',
							offsetParameter: 'offset',
							pageSize: Math.min(pageSize, maxLimit),
							type: 'query',
						},
					},
				},
			},
		},
		{
			displayName: 'Limit',
			name: 'limit',
			type: 'number',
			typeOptions: { minValue: 1, maxValue: maxLimit },
			default: 50,
			description: 'Max number of results to return',
			displayOptions: { show: { ...show, returnAll: [false] } },
			routing: { send: { type: 'query', property: 'limit' } },
		},
	];
}
