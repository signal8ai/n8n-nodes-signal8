import type { INodeProperties } from 'n8n-workflow';
import { tickerField, tickerPath, unwrap } from '../shared';

const show = { resource: ['company'] };

export const companyDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show },
		options: [
			{
				name: 'Get Quote',
				value: 'getQuote',
				action: 'Get a stock quote',
				description:
					'Get the latest stock quote for a ticker, including trading halt status when the ticker is halted',
				routing: {
					request: { method: 'GET', url: `=/companies/${tickerPath()}/quote` },
					...unwrap(),
				},
			},
			{
				name: 'Search',
				value: 'search',
				action: 'Search companies',
				description: 'Search companies by name or ticker symbol',
				routing: {
					request: { method: 'GET', url: '=/companies/search' },
					...unwrap('companies'),
				},
			},
		],
		default: 'getQuote',
	},
	tickerField('company', 'getQuote'),
	{
		displayName: 'Query',
		name: 'query',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'Apple',
		description: 'Company name or ticker symbol to search for',
		displayOptions: { show: { ...show, operation: ['search'] } },
		routing: { send: { type: 'query', property: 'q' } },
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		typeOptions: { minValue: 1, maxValue: 100 },
		default: 50,
		description: 'Max number of results to return',
		displayOptions: { show: { ...show, operation: ['search'] } },
		routing: { send: { type: 'query', property: 'limit' } },
	},
];
