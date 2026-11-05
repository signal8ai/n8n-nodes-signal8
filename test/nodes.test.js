// Unit tests for request construction and trigger dedupe.
// Run after `npm run build`: `npm test`. No network calls are made.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const dist = (p) => path.join(__dirname, '..', 'dist', p);
const { Signal8 } = require(dist('nodes/Signal8/Signal8.node.js'));
const { Signal8Trigger, buildPollRequest } = require(
	dist('nodes/Signal8Trigger/Signal8Trigger.node.js'),
);
const { Signal8Api } = require(dist('credentials/Signal8Api.credentials.js'));
const dedupeLib = require(dist('nodes/Signal8Trigger/dedupe.js'));

const node = new Signal8().description;

/** Evaluates an n8n `={{ ... }}`-style URL template with a fake $parameter object. */
function renderUrl(template, parameters) {
	assert.ok(template.startsWith('='), `expected an expression: ${template}`);
	return template.slice(1).replace(/\{\{(.+?)\}\}/g, (_, expr) =>
		// eslint-disable-next-line no-new-func
		String(new Function('$parameter', `return (${expr});`)(parameters)),
	);
}

function operation(resource, value) {
	const prop = node.properties.find(
		(p) => p.name === 'operation' && p.displayOptions.show.resource.includes(resource),
	);
	assert.ok(prop, `no operation property for ${resource}`);
	const op = prop.options.find((o) => o.value === value);
	assert.ok(op, `no operation ${resource}.${value}`);
	return op;
}

function fieldsFor(resource, op) {
	return node.properties.filter((p) => {
		const show = p.displayOptions && p.displayOptions.show;
		return (
			show &&
			show.resource &&
			show.resource.includes(resource) &&
			show.operation &&
			show.operation.includes(op)
		);
	});
}

function postReceiveKeys(op) {
	return op.routing.output.postReceive.map((s) => s.properties.property);
}

const cases = [
	['company', 'getQuote', { ticker: ' aapl ' }, '/companies/AAPL/quote', ['data']],
	['company', 'search', {}, '/companies/search', ['data', 'companies']],
	[
		'insider',
		'getTransactions',
		{ ticker: 'tsla' },
		'/intelligence/TSLA/insider-transactions',
		['data', 'transactions'],
	],
	['dilution', 'getSnapshot', { ticker: 'mdcx' }, '/dilution/MDCX/snapshot', ['data']],
	['filing', 'getRecentMaterial', {}, '/filings/recent-material', ['data', 'filings']],
	['tradingHalt', 'list', {}, '/trading-halts', ['data', 'halts']],
	[
		'congress',
		'getRecentTrades',
		{ ticker: 'nvda' },
		'/senate-insiders/by-ticker/NVDA/recent-trades',
		['data', 'trades'],
	],
];

for (const [resource, op, params, expectedPath, unwrapKeys] of cases) {
	test(`${resource}.${op} builds GET ${expectedPath}`, () => {
		const o = operation(resource, op);
		assert.equal(o.routing.request.method, 'GET');
		assert.equal(renderUrl(o.routing.request.url, params), expectedPath);
		assert.deepEqual(postReceiveKeys(o), unwrapKeys);
	});
}

test('ticker is URL-encoded so it cannot alter the path', () => {
	const o = operation('company', 'getQuote');
	assert.equal(renderUrl(o.routing.request.url, { ticker: 'a/../b' }), '/companies/A%2F..%2FB/quote');
});

test('query parameters map to the names in the OpenAPI spec', () => {
	const sent = (resource, op) => {
		const out = {};
		for (const p of fieldsFor(resource, op)) {
			const children = p.type === 'collection' ? p.options : [p];
			for (const c of children) {
				if (c.routing && c.routing.send && c.routing.send.property) out[c.name] = c.routing.send.property;
			}
		}
		return out;
	};
	assert.deepEqual(sent('company', 'search'), { query: 'q', limit: 'limit' });
	assert.deepEqual(sent('insider', 'getTransactions'), { limit: 'limit' });
	assert.deepEqual(sent('filing', 'getRecentMaterial'), {
		universe: 'universe',
		limit: 'limit',
		items: 'items',
	});
	assert.deepEqual(sent('congress', 'getRecentTrades'), {
		limit: 'limit',
		direction: 'direction',
		days: 'days',
	});
});

test('list operations use Return All + Limit, never a user-facing Offset', () => {
	for (const [resource, op, maxLimit] of [
		['insider', 'getTransactions', 500],
		['congress', 'getRecentTrades', 200],
	]) {
		const fields = fieldsFor(resource, op);
		const flat = fields.flatMap((p) => (p.type === 'collection' ? [p, ...p.options] : [p]));
		assert.ok(!flat.some((p) => p.name === 'offset'), `${resource}.${op} must not expose offset`);
		const returnAll = fields.find((p) => p.name === 'returnAll');
		assert.ok(returnAll, `${resource}.${op} has Return All`);
		assert.equal(returnAll.type, 'boolean');
		assert.equal(returnAll.default, false);
		assert.equal(returnAll.routing.send.paginate, '={{ $value }}');
		const pg = returnAll.routing.operations.pagination;
		assert.equal(pg.type, 'offset');
		assert.deepEqual(
			{ l: pg.properties.limitParameter, o: pg.properties.offsetParameter, t: pg.properties.type },
			{ l: 'limit', o: 'offset', t: 'query' },
		);
		assert.ok(pg.properties.pageSize >= 1 && pg.properties.pageSize <= maxLimit);
		const limit = fields.find((p) => p.name === 'limit');
		assert.deepEqual(limit.displayOptions.show.returnAll, [false]);
		assert.equal(limit.typeOptions.maxValue, maxLimit);
	}
});

test('base URL comes from the credential with trailing slashes removed', () => {
	const expr = node.requestDefaults.baseURL;
	const inner = expr.match(/^=\{\{(.+)\}\}$/)[1];
	// eslint-disable-next-line no-new-func
	const evaluate = (baseUrl) => new Function('$credentials', `return (${inner});`)({ baseUrl });
	assert.equal(evaluate('https://api.signal8.ai/api/v1/public/'), 'https://api.signal8.ai/api/v1/public');
	assert.equal(evaluate('https://api.signal8.ai/api/v1/public'), 'https://api.signal8.ai/api/v1/public');
});

test('credential sends X-Api-Key and tests against company search', () => {
	const cred = new Signal8Api();
	assert.equal(cred.name, 'signal8Api');
	assert.deepEqual(cred.authenticate.properties.headers, { 'X-Api-Key': '={{$credentials.apiKey}}' });
	assert.equal(cred.test.request.url, '/companies/search');
	assert.equal(cred.test.request.baseURL, '={{$credentials.baseUrl}}');
	const base = cred.properties.find((p) => p.name === 'baseUrl');
	assert.equal(base.default, 'https://api.signal8.ai/api/v1/public');
	const key = cred.properties.find((p) => p.name === 'apiKey');
	assert.equal(key.typeOptions.password, true);
	assert.equal(key.default, '');
});

test('trigger request for halts', () => {
	const r = buildPollRequest('https://api.signal8.ai/api/v1/public/', 'newTradingHalt', {});
	assert.equal(r.method, 'GET');
	assert.equal(r.url, 'https://api.signal8.ai/api/v1/public/trading-halts');
	assert.equal(r.qs, undefined);
});

test('trigger request for material filings', () => {
	const r = buildPollRequest('https://api.signal8.ai/api/v1/public', 'newMaterialFiling', {
		universe: 'ndx',
		items: ' 1.01,5.02 ',
		limit: 25,
	});
	assert.equal(r.url, 'https://api.signal8.ai/api/v1/public/filings/recent-material');
	assert.deepEqual(r.qs, { universe: 'ndx', limit: 25, items: '1.01,5.02' });
	const noItems = buildPollRequest('https://x.test', 'newMaterialFiling', { universe: 'sp500', items: '' });
	assert.deepEqual(noItems.qs, { universe: 'sp500' });
});

test('trigger node is a polling trigger with the expected events', () => {
	const d = new Signal8Trigger().description;
	assert.equal(d.polling, true);
	assert.deepEqual(d.inputs, []);
	const ev = d.properties.find((p) => p.name === 'event');
	assert.deepEqual(ev.options.map((o) => o.value).sort(), ['newMaterialFiling', 'newTradingHalt']);
});

test('halt and filing ids are stable', () => {
	const { haltId, filingId } = dedupeLib;
	assert.equal(
		haltId({ ticker: 'abc', haltCode: 'T1', haltedAt: '2026-11-02T14:00:00.000Z' }),
		haltId({ ticker: 'ABC', haltCode: 'T12', haltedAt: '2026-11-02T14:00:00.000Z' }),
	);
	assert.equal(
		filingId({
			ticker: 'GOOGL',
			filingUrl: 'https://www.sec.gov/Archives/edgar/data/1652044/000165204426000075/0001652044-26-000075-index.htm',
		}),
		'0001652044-26-000075|GOOGL',
	);
	assert.equal(filingId({ ticker: 'X', filingUrl: 'https://example.test/f' }), 'https://example.test/f|X');
});

test('dedupe: first poll records ids and emits nothing', () => {
	const rows = [{ id: 'a' }, { id: 'b' }];
	const r = dedupeLib.dedupe(rows, undefined, (x) => x.id);
	assert.deepEqual(r.fresh, []);
	assert.deepEqual(r.seen, ['a', 'b']);
});

test('dedupe: later polls emit only unseen rows', () => {
	const r = dedupeLib.dedupe([{ id: 'c' }, { id: 'a' }, { id: 'c' }], ['a', 'b'], (x) => x.id);
	assert.deepEqual(r.fresh, [{ id: 'c' }]);
	assert.deepEqual(r.seen, ['c', 'a', 'b']);
});

test('dedupe: an empty response keeps earlier ids so rows are not replayed', () => {
	const empty = dedupeLib.dedupe([], ['a', 'b'], (x) => x.id);
	assert.deepEqual(empty.seen, ['a', 'b']);
	const back = dedupeLib.dedupe([{ id: 'a' }], empty.seen, (x) => x.id);
	assert.deepEqual(back.fresh, []);
});

test('dedupe: remembered ids are capped', () => {
	const prev = Array.from({ length: 10 }, (_, i) => `old${i}`);
	const r = dedupeLib.dedupe([{ id: 'new' }], prev, (x) => x.id, 5);
	assert.deepEqual(r.seen, ['new', 'old0', 'old1', 'old2', 'old3']);
});

test('extractRows reads data.<key> and tolerates bad bodies', () => {
	const { extractRows } = dedupeLib;
	assert.deepEqual(extractRows({ data: { halts: [{ ticker: 'A' }, null, 3] } }, 'halts'), [{ ticker: 'A' }]);
	assert.deepEqual(extractRows({ data: { halts: [] } }, 'halts'), []);
	assert.deepEqual(extractRows(null, 'halts'), []);
	assert.deepEqual(extractRows({ error: 'x' }, 'halts'), []);
});

test('public copy has no em dashes or advice language', () => {
	const texts = [];
	const walk = (v) => {
		if (Array.isArray(v)) v.forEach(walk);
		else if (v && typeof v === 'object') {
			for (const [k, x] of Object.entries(v)) {
				if (['displayName', 'description', 'name', 'action', 'placeholder'].includes(k) && typeof x === 'string') {
					texts.push(x);
				}
				walk(x);
			}
		}
	};
	walk(node);
	walk(new Signal8Trigger().description);
	walk(new Signal8Api().properties);
	const banned = /\u2014|\u2013|\bbuy signal\b|\bprofit\b|beat the market|\brecommend|\bguarantee/i;
	for (const t of texts) assert.ok(!banned.test(t), `disallowed copy: ${t}`);
});

test('trigger keeps optional fields inside an Options collection (n8n review)', () => {
	const props = new Signal8Trigger().description.properties;
	const top = props.map((p) => p.name);
	assert.ok(!top.includes('items'), 'Item Codes must not be top-level');
	assert.ok(!top.includes('limit'), 'Limit must not be top-level');
	const options = props.find((p) => p.name === 'options');
	assert.equal(options.type, 'collection');
	assert.deepEqual(options.displayOptions.show.event, ['newMaterialFiling']);
	assert.deepEqual(options.options.map((o) => o.name).sort(), ['items', 'limit']);
	assert.equal(options.options.find((o) => o.name === 'limit').default, 50);
});
