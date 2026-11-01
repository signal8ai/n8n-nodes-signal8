import type { INodeProperties } from 'n8n-workflow';
import { tickerField, tickerPath, unwrap } from '../shared';

export const dilutionDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['dilution'] } },
		options: [
			{
				name: 'Get Snapshot',
				value: 'getSnapshot',
				action: 'Get a dilution snapshot',
				description:
					'Get the current dilution snapshot for a company, extracted from its SEC filings with per-field citations. A null figure means it was not measured.',
				routing: {
					request: { method: 'GET', url: `=/dilution/${tickerPath()}/snapshot` },
					...unwrap(),
				},
			},
		],
		default: 'getSnapshot',
	},
	tickerField('dilution', 'getSnapshot'),
];
