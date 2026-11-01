import type {
	IAuthenticateGeneric,
	Icon,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class Signal8Api implements ICredentialType {
	name = 'signal8Api';

	displayName = 'Signal8 API';

	icon: Icon = { light: 'file:../icons/signal8.svg', dark: 'file:../icons/signal8.dark.svg' };

	documentationUrl = 'https://signal8.ai/developer/docs';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
			placeholder: 'sk_live_xxx',
			description: 'API key from the Signal8 developer portal. It starts with sk_live_.',
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://api.signal8.ai/api/v1/public',
			description: 'Base URL of the Signal8 public API. Leave the default unless Signal8 support gives you a different one.',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'X-Api-Key': '={{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl}}',
			url: '/companies/search',
			method: 'GET',
			qs: {
				q: 'AAPL',
				limit: 1,
			},
		},
	};
}
