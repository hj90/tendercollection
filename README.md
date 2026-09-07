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

The initial live run on 7 September 2026 retrieved 406 VendorPanel records; AusTender returned HTTP 403 despite a descriptive User-Agent. No AusTender HTML scraping is implemented. AusTender parser tests use a synthetic RSS fixture, not a claim that its live schema has been validated. Unknown or incomplete source schemas fail closed and retain previous data. Revalidate the parser against a real response when access becomes available.

VendorPanel descriptions are parsed from the feed's embedded labelled HTML. XML itself is parsed by fast-xml-parser. The GUID is the source ID; internal identity includes the source to prevent cross-feed collisions. Categories use individual XML category elements and are never split on commas. Dates use Luxon fixed-offset parsing; numeric UTC offsets override timezone labels. Every missing or invalid closing date logs a warning. Unparseable dates stay null and never appear in closing-soon views.

AusTender mapping: `guid` → id; `title` → title; `link` → sourceUrl; `pubDate` → publishedAt; category elements → categories. Agency/Agency Name/buyer fields → buyer; ATM ID/reference → reference; Location/Location of Services/state → state; Closing Date/Close Date & Time/Close Date/closingDate → closing date; Contact/Contact Officer → contact. Namespaced XML fields and labelled description lines are accepted. Multi-state/national locations remain null. Agency type is `other` because the v1 enum has no federal-agency value. Explicit AEST/AEDT dates use fixed offsets; unqualified Australian dates use Australia/Sydney. Unknown schema fails the whole source, rather than accepting an incomplete snapshot.

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

`.github/workflows/fetch.yml` uses `cron: '0 6 * * *'` with `timezone: Australia/Sydney` and supports manual `workflow_dispatch`. Current [GitHub documentation](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#onschedule) supports IANA timezones. This avoids the older UTC-only limitation and adjusts automatically for daylight saving.

6:00am Sydney corresponds to **20:00 UTC on the previous day during AEST (UTC+10)** and **19:00 UTC on the previous day during AEDT (UTC+11)**. On an older GitHub installation without timezone support, use two UTC schedules (19:00 and 20:00) and gate on the scheduled instant's Sydney offset, not just the runner's current hour. Do not silently use one fixed UTC schedule. Actions scheduling can be delayed; this is a daily target, not a hard real-time guarantee. Public repository schedules may be disabled after extended repository inactivity; monitor Actions and re-enable if needed.

The workflow tests, fetches, exports the site, and commits only changed snapshots/archive/source status. No `vercel.json` cron exists. Pushes made with GITHUB_TOKEN do not start another Actions workflow; Vercel's GitHub integration handles deployment on the pushed commit. Confirm its deployment hook on an actual refresh run during setup.

## Vercel deployment

Use a personally owned GitHub repository, not an organisation repository, with Vercel Hobby. The project must remain non-commercial; changing this requires reviewing the hosting plan before adding any commercial feature.

Import the repository as `tendercollection`, framework Next.js, install `npm ci`, build `npm run build`, output directory `out`. Target `tendercollection.vercel.app` if available. Enable the existing Vercel GitHub integration for this repository so daily data commits rebuild production. No deployment secrets belong in Git.

## Acceptance verification

`npm test` covers fixed and half-hour offsets; missing-date warnings; XML category boundaries; CDATA extraction; bot-block rejection; synthetic AusTender field mapping; forward-notice precedence; buyer matching and fallback; idempotency; failed-source retention; disappearance, reappearance and 12-month pruning; closing-date history; duplicate detection; URL filters; description search; and expiry/closing-soon exclusion.

A successful `npm run build` verifies strict TypeScript and exports all routes. The first validated build generated 406 tender pages and 159 buyer pages, plus the listing, about and not-found routes. Live GitHub Actions execution, no-change commit behaviour and production deployment must additionally be confirmed after repository and hosting authentication are available.
