# n8n-nodes-signal8

This is an n8n community node package for the [Signal8](https://signal8.ai) public API. It lets you read SEC filing data, insider transactions, dilution snapshots, trading halts and congressional trade disclosures in your n8n workflows.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/sustainable-use-license/) workflow automation platform.

- [Installation](#installation)
- [Credentials](#credentials)
- [Operations](#operations)
- [Trigger](#trigger)
- [Example workflow](#example-workflow)
- [Compatibility](#compatibility)
- [Resources](#resources)

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation. The package name is `n8n-nodes-signal8`.

## Credentials

You need a Signal8 API key.

1. Sign in at [signal8.ai](https://signal8.ai) and open the developer portal.
2. Create an API key. Keys start with `sk_live_`.
3. In n8n, create a **Signal8 API** credential and paste the key into **API Key**.

**Base URL** defaults to `https://api.signal8.ai/api/v1/public`. Leave it unchanged unless Signal8 support gives you a different one.

The key is sent in the `X-Api-Key` header. When you save the credential, n8n checks it with one company search request (`GET /companies/search?q=AAPL&limit=1`), which uses 1 API credit.

## Operations

Each call uses API credits from your Signal8 plan. Credit costs are listed in the [API documentation](https://signal8.ai/developer/docs).

| Resource | Operation | Endpoint | Returns |
|---|---|---|---|
| Company | Get Quote | `GET /companies/{ticker}/quote` | The latest quote for a ticker. Halted tickers include `halted`, `haltCode`, `haltReason`, `haltedAt` and `resumptionAt`. |
| Company | Search | `GET /companies/search` | Companies matching a name or ticker, one item per company. |
| Insider | Get Transactions | `GET /intelligence/{ticker}/insider-transactions` | Form 4 insider transactions, one item per transaction. Return All, or up to a Limit. |
| Dilution | Get Snapshot | `GET /dilution/{ticker}/snapshot` | The current dilution snapshot extracted from SEC filings, with citations. A null figure means it was not measured. Instrument rows are not part of this response. |
| Filing | Get Recent Material Filings | `GET /filings/recent-material` | 8-K filings from the last 7 days for companies in the S&P 500, NASDAQ-100 or Dow Jones Industrial Average, filtered by item code. One item per filing. |
| Trading Halt | List | `GET /trading-halts` | Trading halts currently active on NASDAQ, NYSE and NYSE American, one item per halt. No items means no halts are active. |
| Congress | Get Recent Trades for Ticker | `GET /senate-insiders/by-ticker/{ticker}/recent-trades` | Recent STOCK Act disclosures for a ticker, one item per trade. Filter by direction and lookback days. Return All, or up to a Limit. |

Responses are unwrapped from the API's `{ "data": ... }` envelope. List operations return one n8n item per row.

The Signal8 node can also be used as a tool by the n8n AI Agent.

## Trigger

The **Signal8 Trigger** node polls the API on the schedule you set in n8n and starts the workflow when something new appears.

| Event | Endpoint | How an item is identified |
|---|---|---|
| New Trading Halt | `GET /trading-halts` | Ticker plus halt start time (`haltedAt`). A change of halt code during the same halt is not a new halt. |
| New Material Filing | `GET /filings/recent-material` | SEC accession number (read from `filingUrl`) plus ticker. |

Behaviour:

- The first poll after you activate the workflow records what is currently in the feed and does not start the workflow. Later polls emit only items that were not seen before.
- The node remembers up to 1,000 recent ids in the workflow's static data.
- A manual test run (**Fetch Test Event**) returns the newest item without changing the stored state.
- Every poll is one API request and uses credits (1 for halts, 5 for material filings at the time of writing). Choose a poll interval with that in mind.

## Example workflow

Post new trading halts to a chat channel:

1. **Signal8 Trigger**: Trigger On = New Trading Halt, poll every minute.
2. **Slack** (or any chat node): message text `{{$json.ticker}} halted ({{$json.haltCode}}) at {{$json.haltedAt}}`.

Look up recent congressional trades for a list of tickers:

1. **Manual Trigger** or **Schedule Trigger**.
2. **Code** node returning items like `{ "ticker": "NVDA" }`.
3. **Signal8**: Resource = Congress, Operation = Get Recent Trades for Ticker, Ticker = `{{$json.ticker}}`.

## Compatibility

Built with `@n8n/node-cli` 0.54 against n8n nodes API version 1. Tested with the unit tests in `test/` (no live API calls).

## Development

```bash
npm install
npm run build
npm run lint
npm test
npm run dev   # starts a local n8n with the nodes loaded
```

The package has no runtime dependencies. It makes no network requests other than to the Base URL in the credential.

## Resources

- [Signal8 API documentation](https://signal8.ai/developer/docs)
- [Signal8](https://signal8.ai)
- [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)

## License

[MIT](LICENSE.md)
