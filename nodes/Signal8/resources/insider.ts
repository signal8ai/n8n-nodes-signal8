import type { INodeProperties } from 'n8n-workflow';
import { tickerField, tickerPath, unwrap } from '../shared';

const show = { resource: ['insider'] };
const showGet = { ...show, operation: ['getTransactions'] };

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
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		typeOptions: { minValue: 1, maxValue: 500 },
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
				displayName: 'Offset',
				name: 'offset',
				type: 'number',
				typeOptions: { minValue: 0 },
				default: 0,
				description: 'Number of results to skip, for paging through older transactions',
				routing: { send: { type: 'query', property: 'offset' } },
			},
		],
	},
];
