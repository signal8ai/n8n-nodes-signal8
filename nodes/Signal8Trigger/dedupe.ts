/**
 * Pure helpers for the Signal8 Trigger poll. No n8n imports, so they can be
 * unit tested against the compiled output without an n8n runtime.
 */

/** Upper bound on remembered ids per trigger, so static data cannot grow without limit. */
export const MAX_SEEN_IDS = 1000;

const ACCESSION_RE = /\d{10}-\d{2}-\d{6}/;

type Row = Record<string, unknown>;

const str = (v: unknown): string => (v === null || v === undefined ? '' : String(v));

/**
 * A trading halt is identified by ticker plus the time it started. The halt code
 * is left out on purpose: the exchange can change it during one halt (for example
 * from a news pending code to a resumption code), and that is not a new halt.
 */
export function haltId(row: Row): string {
	return `${str(row.ticker).toUpperCase()}|${str(row.haltedAt)}`;
}

/**
 * A material filing is identified by its SEC accession number plus ticker (one
 * filing can be listed under several share classes). The accession number is read
 * from the filing URL; when the URL carries none, the whole URL is used instead.
 */
export function filingId(row: Row): string {
	const url = str(row.filingUrl);
	const accession = url.match(ACCESSION_RE)?.[0] ?? url;
	return `${accession}|${str(row.ticker).toUpperCase()}`;
}

export interface DedupeResult<T> {
	/** Rows not seen on any earlier poll, in the order the API returned them. */
	fresh: T[];
	/** Ids to store for the next poll. */
	seen: string[];
}

/**
 * Splits a poll result into rows not seen before and the id list to remember.
 *
 * When `previous` is undefined this is the first poll: every current row is
 * recorded and none is emitted, so activating a workflow does not replay
 * everything that is already in the feed.
 *
 * Ids from earlier polls are kept (newest first, capped at `max`) even when they
 * drop out of the current response. Otherwise a temporarily empty response, which
 * the halts endpoint can return during a cold snapshot, would make every row look
 * new on the following poll.
 */
export function dedupe<T extends Row>(
	rows: T[],
	previous: string[] | undefined,
	idOf: (row: T) => string,
	max = MAX_SEEN_IDS,
): DedupeResult<T> {
	const currentIds = rows.map(idOf);
	const known = new Set(previous ?? []);
	const fresh: T[] = [];
	if (previous !== undefined) {
		const emitted = new Set<string>();
		rows.forEach((row, i) => {
			const id = currentIds[i];
			if (!known.has(id) && !emitted.has(id)) {
				emitted.add(id);
				fresh.push(row);
			}
		});
	}
	const seen: string[] = [];
	const added = new Set<string>();
	for (const id of [...currentIds, ...(previous ?? [])]) {
		if (!added.has(id)) {
			added.add(id);
			seen.push(id);
			if (seen.length >= max) break;
		}
	}
	return { fresh, seen };
}

/** Reads the list stored under `data.<key>` from a Signal8 response envelope. */
export function extractRows(body: unknown, key: string): Row[] {
	if (!body || typeof body !== 'object') return [];
	const data = (body as { data?: unknown }).data;
	if (!data || typeof data !== 'object') return [];
	const list = (data as Record<string, unknown>)[key];
	return Array.isArray(list)
		? list.filter((r): r is Row => !!r && typeof r === 'object' && !Array.isArray(r))
		: [];
}

/** Normalises the configured base URL by removing trailing slashes. */
export function normaliseBaseUrl(baseUrl: unknown): string {
	return str(baseUrl).trim().replace(/\/+$/, '');
}
