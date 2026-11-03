import type { INodeProperties } from 'n8n-workflow';
import { tickerField, tickerPath, unwrap } from '../shared';

const show = { resource: ['insider'] };

export const insiderDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show },
		options: [
			{
				name: 'Get Transactions',
				value: 'getTransactions',
				action: 'Get insider transactions',
				description:
					'Get insider buy and sell transactions for a company from SEC Form 4 filings, with insider name, title, shares, price and transaction code',
				routing: {
					request: {
						method: 'GET',
						url: `=/intelligence/${tickerPath()}/insider-transactions`,
					},
					...unwrap('transactions'),
				},
			},
		],
		default: 'getTransactions',
	},
	tickerField('insider', 'getTransactions'),
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: { show: { resource: ['insider'], operation: ['getTransactions'] } },
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
		typeOptions: { minValue: 1, maxValue: 500 },
		default: 50,
		description: 'Max number of results to return',
		displayOptions: { show: { resource: ['insider'], operation: ['getTransactions'], returnAll: [false] } },
		routing: { send: { type: 'query', property: 'limit' } },
	},
];
