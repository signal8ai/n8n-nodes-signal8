import { NodeConnectionTypes, type INodeType, type INodeTypeDescription } from 'n8n-workflow';
import { companyDescription } from './resources/company';
import { congressDescription } from './resources/congress';
import { dilutionDescription } from './resources/dilution';
import { filingDescription } from './resources/filing';
import { insiderDescription } from './resources/insider';
import { tradingHaltDescription } from './resources/tradingHalt';

export class Signal8 implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Signal8',
		name: 'signal8',
		icon: { light: 'file:../../icons/signal8.svg', dark: 'file:../../icons/signal8.dark.svg' },
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description:
			'Read SEC filing data, insider transactions, dilution snapshots, trading halts and congressional trades from the Signal8 API',
		defaults: {
			name: 'Signal8',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'signal8Api',
				required: true,
			},
		],
		requestDefaults: {
			baseURL: '={{String($credentials.baseUrl).replace(/\\/+$/, "")}}',
			headers: {
				Accept: 'application/json',
			},
		},
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Company', value: 'company' },
					{ name: 'Congress', value: 'congress' },
					{ name: 'Dilution', value: 'dilution' },
					{ name: 'Filing', value: 'filing' },
					{ name: 'Insider', value: 'insider' },
					{ name: 'Trading Halt', value: 'tradingHalt' },
				],
				default: 'company',
			},
			...companyDescription,
			...congressDescription,
			...dilutionDescription,
			...filingDescription,
			...insiderDescription,
			...tradingHaltDescription,
		],
	};
}
