import type { INodeProperties } from 'n8n-workflow';
import { unwrap } from '../shared';

export const tradingHaltDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['tradingHalt'] } },
		options: [
			{
				name: 'List',
				value: 'list',
				action: 'List active trading halts',
				description:
					'List trading halts currently active on NASDAQ, NYSE and NYSE American, newest first. An empty result means no halts are active.',
				routing: {
					request: { method: 'GET', url: '=/trading-halts' },
					...unwrap('halts'),
				},
			},
		],
		default: 'list',
	},
];
