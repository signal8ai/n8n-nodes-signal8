import type { INodeProperties } from 'n8n-workflow';
import { tickerField, tickerPath, unwrap } from '../shared';

const show = { resource: ['congress'] };
const showGet = { ...show, operation: ['getRecentTrades'] };

export const congressDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show },
		options: [
			{
				name: 'Get Recent Trades for Ticker',
				value: 'getRecentTrades',
				action: 'Get recent congressional trades for a ticker',
				description:
					'Get recent STOCK Act trade disclosures by members of Congress and executive branch officials for a ticker, with amount range, filing delay and a link to the filing',
				routing: {
					request: {
						method: 'GET',
						url: `=/senate-insiders/by-ticker/${tickerPath()}/recent-trades`,
					},
					...unwrap('trades'),
				},
			},
		],
		default: 'getRecentTrades',
	},
	tickerField('congress', 'getRecentTrades'),
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: { show: { resource: ['congress'], operation: ['getRecentTrades'] } },
		routing: {
			send: { paginate: '={{ $value }}' },
			operations: {
				pagination: {
					type: 'offset',
					properties: {
						limitParameter: 'limit',
						offsetParameter: 'offset',
						pageSize: 100,
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
		typeOptions: { minValue: 1, maxValue: 200 },
		default: 50,
		description: 'Max number of results to return',
		displayOptions: { show: { resource: ['congress'], operation: ['getRecentTrades'], returnAll: [false] } },
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
				displayName: 'Direction',
				name: 'direction',
				type: 'options',
				options: [
					{ name: 'Purchases Only', value: 'buy' },
					{ name: 'Sales Only', value: 'sell' },
				],
				default: 'buy',
				description: 'Only return purchases or only return sales. Leave unset to return both.',
				routing: { send: { type: 'query', property: 'direction' } },
			},
			{
				displayName: 'Lookback Days',
				name: 'days',
				type: 'number',
				typeOptions: { minValue: 1, maxValue: 1825 },
				default: 180,
				description: 'Number of days to look back',
				routing: { send: { type: 'query', property: 'days' } },
			},
		],
	},
];
