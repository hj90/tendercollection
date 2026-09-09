# Tender Collection

A free, independent Australian tender directory. Next.js App Router, TypeScript, Tailwind, fast-xml-parser and Luxon. Static export only: no accounts, database, server, browser storage, ads or payments.

## Develop

Requires Node 22 or later.

```sh
npm ci
npm run fetch
npm test
npm run dev
npm run build
```

`out/` is the complete deployable static site. Every active and retained archived tender has a generated detail page. Buyer pages include both current and archived records. Search uses a compact listing projection and an inverted word index built from title, buyer and description; contacts, descriptions and change histories are not sent as full tender objects to the listing. Search matches all entered words, with prefix matching. Filters and sort live in URL query parameters, with browser back/forward support.

## Sources

- VendorPanel: https://www.vendorpanel.com.au/PublicTendersRssV2.aspx?mode=all
- AusTender: https://www.tenders.gov.au/public_data/rss/rss.xml

AusTender was repaired after testing its real feed on 8 September 2026. Its server rejects our custom-only User-Agent but accepts a browser-compatible one that also identifies Tender Collection. No credentials or cookies are used.

The RSS has only title, link, description, GUID and publication date. The fetcher reads the public Atm/Show and Advert/Show pages linked in RSS, sequentially, to obtain agency, closing date, category, location and contact. This is the specifically authorised exception to v1’s RSS-only design. No documents or login pages are fetched. If an RSS-linked notice has since closed, the fetcher follows only a same-host ShowClosed redirect for that exact notice ID. The expired record remains excluded from open results until the RSS drops it. All other redirects fail closed. A malformed or failed detail page rejects the entire AusTender refresh and retains the previous snapshot; partial enrichment never triggers mass archival.

RSS GUIDs remain intact in the data. Separate deterministic path-safe route IDs handle AusTender’s URL-valued GUIDs. XML uses fast-xml-parser; public HTML uses Cheerio. Real-feed and public-page fixtures cover both notice templates. ACT Local Time uses Australia/Sydney with automatic daylight saving; explicit AEST and AEDT use fixed offsets. Multi-state and overseas notices stay unspecified in the single-state schema, with a warning. Categories retain the displayed source code and label as one string.

VendorPanel discovery remains RSS-based. The refresh also reads the anonymous public preview linked from each RSS record to enrich individual pages with opening and query cut-off dates, expected decision date, background, desired outcomes, buyer questions, service regions, public Q&A and buyer updates. Six bounded workers fetch previews; a failed preview retains that tender's previous enrichment without failing or shrinking the RSS snapshot. No supplier login, tender documents or submission pages are accessed. Categories use individual XML category elements, never comma splitting. The listing filter maps both source taxonomies into 13 shared browsing groups while preserving each source's original category labels on cards and tender pages. Numeric UTC offsets override timezone labels. Every missing or invalid closing date is logged.

## Buyer map

`data/buyers.json` is hand-seeded from the 148 organisations in VendorPanel's public organisation dropdown on 7 September 2026:
https://www.vendorpanel.com.au/publictenders.aspx

Names are matched exactly, then case- and punctuation-insensitively. Map entries have `{state, type}`. National organisations AFAC and AEMO intentionally have null state. Government buyer names refer to the organisations in this feed, not similarly named departments in other states. Validate any new ambiguous name before extending the map. The initial map provides non-null states for 387 of 406 records (95.3%). Every unmapped item is logged. The remaining misses are primarily Queensland Transport and Main Roads subdivisions and Invest Gold Coast; their timezone fallback is logged, not counted toward buyer-map coverage.

State seed references include the [NSW council directory](https://www.olg.nsw.gov.au/public/local-government-directory) and [Queensland local government reporting](https://www.localgovernment.qld.gov.au/__data/assets/pdf_file/0030/99174/commission-report-2024.pdf). State denotes buyer location, not a guarantee of work location. Only Brisbane, Adelaide, Perth, Hobart and Darwin have timezone-label fallback mappings. Canberra/Melbourne/Sydney stays unknown.

## Snapshot semantics

- `data/tenders.json`: records in the latest successful snapshot for each source. An expired record may remain in a feed; the browser excludes past closing dates independently and rechecks every 30 seconds.
- `data/archive.json`: records that disappeared from a successful source snapshot, with `archivedAt`. Retention is 12 calendar months from archival; older records remain in Git history.
- Active records have `firstSeenAt` and `changes`, never `lastSeenAt`.
- Every changed source field appends a `{field, from, to, at}` history entry. Compound values are JSON strings. Bookkeeping fields are excluded.
- A failed source is carried forward unchanged. Only successful sources undergo disappearance detection. Invalid XML, incomplete required fields, duplicate GUIDs and unexpected empty feeds fail closed. Empty feeds require operator investigation rather than mass archival.
- A returning archived record recovers its original firstSeenAt and change history.
- Record and archive ordering is deterministic. Identical feeds produce identical tracked files; no timestamp-only commit occurs.
- `data/meta.json` records source availability transitions and when the committed source snapshot changed or recovered. The website calls this a **snapshot date**, never a last-poll timestamp. A snapshot older than 36 hours is visibly labelled.
- Each fetch writes ignored `data/fetch-report.json`, including exact attempt/success times, warnings and counts. GitHub uploads it as a 30-day workflow artifact. This provides fetch audit information without noisy commits. Both-source failure retains data, updates source status, and fails the job after publishing its report.

## Classification

Forward-notice signals are checked across title and description first. Remaining types use title before description with precedence panel → EOI → RFQ → RFT → other. This is keyword classification, not authoritative procurement advice. Forward notices are visually marked as not accepting submissions and excluded from closing windows and closing-soonest sort.

## Daily schedule and DST

`.github/workflows/fetch.yml` uses `cron: '0 6 * * *'` with `timezone: Australia/Sydney` and supports manual `workflow_dispatch`. Changes to ingestion scripts, parsers or this workflow also trigger a validation refresh. Current [GitHub documentation](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#onschedule) supports IANA timezones. This avoids the older UTC-only limitation and adjusts automatically for daylight saving.

6:00am Sydney corresponds to **20:00 UTC on the previous day during AEST (UTC+10)** and **19:00 UTC on the previous day during AEDT (UTC+11)**. On an older GitHub installation without timezone support, use two UTC schedules (19:00 and 20:00) and gate on the scheduled instant's Sydney offset, not just the runner's current hour. Do not silently use one fixed UTC schedule. Actions scheduling can be delayed; this is a daily target, not a hard real-time guarantee. Public repository schedules may be disabled after extended repository inactivity; monitor Actions and re-enable if needed.

The workflow tests, fetches, exports the site, and commits only changed snapshots/archive/source status. No `vercel.json` cron exists. Pushes made with GITHUB_TOKEN do not start another Actions workflow; Vercel's GitHub integration handles deployment on the pushed commit. Confirm its deployment hook on an actual refresh run during setup.

## Vercel deployment

Use a personally owned GitHub repository, not an organisation repository, with Vercel Hobby. The project must remain non-commercial; changing this requires reviewing the hosting plan before adding any commercial feature.

Import the repository as `tendercollection`, framework Next.js, install `npm ci`, build `npm run build`, output directory `out`. Target `tendercollection.vercel.app` if available. Enable the existing Vercel GitHub integration for this repository so daily data commits rebuild production. No deployment secrets belong in Git.

## Acceptance verification

`npm test` covers fixed and half-hour offsets; missing-date warnings; XML category boundaries; CDATA extraction; bot-block rejection; real AusTender RSS and public detail mapping; forward-notice precedence; buyer matching and fallback; idempotency; failed-source retention; disappearance, reappearance and 12-month pruning; closing-date history; duplicate detection; URL filters; description search; and expiry/closing-soon exclusion.

A successful `npm run build` verifies strict TypeScript and exports all routes. The first validated build generated 406 tender pages and 159 buyer pages, plus the listing, about and not-found routes. GitHub Actions and production deployment were verified, including changed-data commits and a no-change refresh with no commit.
