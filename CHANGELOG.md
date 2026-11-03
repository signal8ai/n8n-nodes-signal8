# Changelog

## 0.1.2

- Insider Get Transactions and Congress Get Recent Trades for Ticker: replaced the Offset option with Return All + Limit. With Return All on, the node pages through the API itself (100 rows per request).

## 0.1.1

- Publish via npm Trusted Publishing (OIDC).

## 0.1.0

- Signal8 API credential (API key, sent as `X-Api-Key`).
- Signal8 node: Company Get Quote and Search, Insider Get Transactions, Dilution Get Snapshot, Filing Get Recent Material Filings, Trading Halt List, Congress Get Recent Trades for Ticker.
- Signal8 Trigger node: New Trading Halt and New Material Filing (polling).
