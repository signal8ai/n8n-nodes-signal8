import {
	NodeApiError,
	NodeConnectionTypes,
	type IDataObject,
	type IHttpRequestOptions,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
	type IPollFunctions,
	type JsonObject,
} from 'n8n-workflow';
import { itemCodesDescription, universeOptions } from '../Signal8/resources/filing';
import { dedupe, extractRows, filingId, haltId, normaliseBaseUrl } from './dedupe';

type TriggerEvent = 'newTradingHalt' | 'newMaterialFiling';

interface EventConfig {
	path: string;
	listKey: string;
	idOf: (row: IDataObject) => string;
}

const EVENTS: Record<TriggerEvent, EventConfig> = {
	newTradingHalt: { path: '/trading-halts', listKey: 'halts', idOf: haltId },
	newMaterialFiling: { path: '/filings/recent-material', listKey: 'filings', idOf: filingId },
};

/** Builds the request for one poll. Exported for unit tests. */
export function buildPollRequest(
	baseUrl: unknown,
	event: TriggerEvent,
	params: { universe?: string; items?: string; limit?: number },
): IHttpRequestOptions {
	const request: IHttpRequestOptions = {
		method: 'GET',
		url: `${normaliseBaseUrl(baseUrl)}${EVENTS[event].path}`,
		headers: { Accept: 'application/json' },
		json: true,
	};
	if (event === 'newMaterialFiling') {
		const qs: IDataObject = { universe: params.universe ?? 'sp500' };
		if (params.limit !== undefined) qs.limit = params.limit;
		const items = (params.items ?? '').trim();
		if (items) qs.items = items;
		request.qs = qs;
	}
	return request;
}

export class Signal8Trigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Signal8 Trigger',
		name: 'signal8Trigger',
		icon: { light: 'file:../../icons/signal8.svg', dark: 'file:../../icons/signal8.dark.svg' },
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["event"]}}',
		description: 'Starts the workflow when Signal8 reports a new trading halt or a new material SEC filing',
		defaults: {
			name: 'Signal8 Trigger',
		},
		polling: true,
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'signal8Api',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Trigger On',
				name: 'event',
				type: 'options',
				noDataExpression: true,
				required: true,
				options: [
					{
						name: 'New Material Filing',
						value: 'newMaterialFiling',
						description:
							'Triggers when a new 8-K filing with a matching item code appears for a company in the chosen index',
					},
					{
						name: 'New Trading Halt',
						value: 'newTradingHalt',
						description: 'Triggers when a new trading halt appears on NASDAQ, NYSE or NYSE American',
					},
				],
				default: 'newTradingHalt',
			},
			{
				displayName:
					'The first poll after activation records the current list and emits nothing. Later polls emit only items not seen before.',
				name: 'firstPollNotice',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'Universe',
				name: 'universe',
				type: 'options',
				required: true,
				options: universeOptions,
				default: 'sp500',
				description: 'Index whose member companies are watched',
				displayOptions: { show: { event: ['newMaterialFiling'] } },
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: { show: { event: ['newMaterialFiling'] } },
				options: [
					{
						displayName: 'Item Codes',
						name: 'items',
						type: 'string',
						default: '',
						placeholder: '1.01,5.02',
						description: itemCodesDescription,
					},
					{
						displayName: 'Limit',
						name: 'limit',
						type: 'number',
						typeOptions: { minValue: 1, maxValue: 200 },
						default: 50,
						description: 'Max number of results to return',
					},
				],
			},
		],
	};

	async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
		const event = this.getNodeParameter('event') as TriggerEvent;
		const config = EVENTS[event];
		const credentials = await this.getCredentials('signal8Api');

		const options =
			event === 'newMaterialFiling'
				? (this.getNodeParameter('options', {}) as { items?: string; limit?: number })
				: {};
		const params =
			event === 'newMaterialFiling'
				? {
						universe: this.getNodeParameter('universe') as string,
						items: options.items ?? '',
						limit: options.limit ?? 50,
					}
				: {};
		const request = buildPollRequest(credentials.baseUrl, event, params);

		let body: unknown;
		try {
			body = await this.helpers.httpRequestWithAuthentication.call(this, 'signal8Api', request);
		} catch (error) {
			throw new NodeApiError(this.getNode(), error as JsonObject);
		}

		const rows = extractRows(body, config.listKey) as IDataObject[];

		// A manual test run shows the newest row without touching the stored state.
		if (this.getMode() === 'manual') {
			return rows.length > 0 ? [this.helpers.returnJsonArray([rows[0]])] : null;
		}

		const staticData = this.getWorkflowStaticData('node');
		const stateKey = `seen_${event}`;
		const previous = Array.isArray(staticData[stateKey])
			? (staticData[stateKey] as string[])
			: undefined;

		const { fresh, seen } = dedupe(rows, previous, config.idOf);
		staticData[stateKey] = seen;

		return fresh.length > 0 ? [this.helpers.returnJsonArray(fresh)] : null;
	}
}
