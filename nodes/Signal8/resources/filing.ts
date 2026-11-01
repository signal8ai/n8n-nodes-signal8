import type { INodeProperties } from 'n8n-workflow';
import { unwrap } from '../shared';

const show = { resource: ['filing'] };
const showGet = { ...show, operation: ['getRecentMaterial'] };

/** Index universes accepted by GET /filings/recent-material. Shared with the trigger node. */
export const universeOptions = [
	{ name: 'Dow Jones Industrial Average', value: 'dji' },
	{ name: 'NASDAQ-100', value: 'ndx' },
	{ name: 'S&P 500', value: 'sp500' },
];

export const itemCodesDescription =
	'Comma-separated 8-K item codes, for example 1.01,5.02. Leave empty to use the default set: 1.01, 2.01, 2.03, 2.05, 3.02, 5.02, 7.01, 8.01.';

export const filingDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show },
		options: [
			{
				name: 'Get Recent Material Filings',
				value: 'getRecentMaterial',
				action: 'Get recent material filings',
				description:
					'Get 8-K filings from the last 7 days for companies in an index, filtered by item code and sorted newest first',
				routing: {
					request: { method: 'GET', url: '=/filings/recent-material' },
					...unwrap('filings'),
				},
			},
		],
		default: 'getRecentMaterial',
	},
	{
		displayName: 'Universe',
		name: 'universe',
		type: 'options',
		required: true,
		options: universeOptions,
		default: 'sp500',
		description: 'Index whose member companies are included',
		displayOptions: { show: showGet },
		routing: { send: { type: 'query', property: 'universe' } },
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		typeOptions: { minValue: 1, maxValue: 200 },
		default: 50,
		description: 'Max number of results to return',
		displayOptions: { show: showGet },
		routing: { send: { type: 'query', property: 'limit' } },
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: { show: showGet },
		options: [
			{
				displayName: 'Item Codes',
				name: 'items',
				type: 'string',
				default: '',
				placeholder: '1.01,5.02',
				description: itemCodesDescription,
				routing: { send: { type: 'query', property: 'items' } },
			},
		],
	},
];
