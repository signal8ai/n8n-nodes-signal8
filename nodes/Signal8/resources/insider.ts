import type { INodeProperties } from 'n8n-workflow';
import { returnAllAndLimit, tickerField, tickerPath, unwrap } from '../shared';

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
	...returnAllAndLimit(showGet, 500),
];
