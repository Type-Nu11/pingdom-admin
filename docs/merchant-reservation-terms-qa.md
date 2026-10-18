# Merchant reservation terms QA (#296, supersedes #256 price contract)

## Contract

- Checked the live `https://www.typenull.xyz/v3/api-docs/merchant` on 2026-10-19 KST (2026-10-18T15:09:05Z). HTTP 200, OpenAPI 3.0.1.
- GET `/merchant-owner/availabilities` supplies nullable `reservationTerms` and `conditionsVersion`.
- PUT `/merchant-owner/availabilities/{availabilityId}/reservation-terms` accepts only `timezone`, `cancellable`, `cancellationCutoffMinutes`. The response has the same three fields. Price/currency fields are removed; even null values are rejected with 400 INVALID_REQUEST_BODY.
- Noncancellable requests send a null cutoff. Allowed cancellation requires an integer cutoff in minutes, 0 through 2147483647 inclusive; 0 means until the start time. Null terms remain unset, not noncancellable.
- Verified the cross-field invariant against `ReservationTermsRequest`, `ReservationTermsResponse`, `ReservationTerms` at server commit `2b3dbe258d5c80d3f8f753ff28bf281ba89ac43d`. Live Swagger agrees on fields, int32/minimum, and removed-field rejection; the domain constructor requires a cutoff iff cancellable.
- Changing the terms timezone does not shift/reinterpret slot timestamps. UTC/KST input conversion is tracked separately in #298.
- Existing accepted reservation snapshots are not edited by this screen.
- Only the two directly affected contract matrix rows were updated. Raw OpenAPI snapshots and unrelated rows remain historical pending #302, not freshly verified contracts.

## Coverage

- `node --test tests/merchant-reservation-terms.test.mjs`: unset/allowed/noncancellable, exact three-field payload, legacy-field rejection (including null), unrelated-field exclusion, invalid timezone/cutoff/choice, saved-value/version reload, HTTP 400/401/403/500, single-flight mutation, stale/wrong-place target, account switch, input retention, and schedule/status preservation.
- `node tests/browser/reservation-terms.mjs`: 1920x1080, 1366x768 and 390x844; modal bounds, input retention after failed writes, unsaved dismissal confirmation, pending dismissal guard, reload persistence and recovery after a successful write followed by a failed query.
- With the cancellation dropdown open, the first Escape closes only its options and restores trigger focus, without closing the editor or showing the unsaved confirmation. A second Escape closes an unchanged editor or prompts before discarding edited input; ordinary dismissal restores focus to the editor opener.
- Browser fixture uses isolated Vite (no .env or proxy), replaces the Axios adapter and blocks non-local/API network access. Its saved rows are synthetic sessionStorage data, not real reservations. It rejects any PUT body other than the current three-field contract.
- A successful PUT followed by a failed GET remains a successful save. Returned terms remain visible, but further edits are blocked until the authoritative list/version is fetched again. Auth errors clear or hide inaccessible results.

## Limitations

- No production reservation terms, quotes, payments, cancellations or refunds were changed.
- Live PUT and server-side mutation authorization QA remain necessary on an explicitly designated test availability. Authenticated merchant reads were verified below; reads do not prove write success.
- Reservation confirmations and payment-related legacy displays are not migrated here (#297). UTC/KST serialization is not fixed here (#298). This change alone is not full reservation release readiness.
- Screenshots are emitted to the temporary directory reported by the browser test. Temporary browsers and Vite servers are closed in `finally`.

## 2026-10-19 verification result

- `npm test`: 804 passed, no failures/cancellations/skips. Targeted terms/query tests: 40 passed.
- `npm run lint`, TypeScript-inclusive `npm run build`, `git diff --check`: passed.
- Terms browser suite passed at 1920×1080, 1366×768, 390×844: only three request keys; 60/0-minute policies and disallowed/null round trips; no price inputs; failure input retention; saved/reloaded values; unsaved/keyboard/pending guards; no horizontal overflow.
- `npm run test:reservation-setup-browser` and `node tests/browser/reservation-conditions.mjs`: passed. The latter still uses legacy confirmation fixtures; it is not proof of #297 compatibility.
- After the user logged in as a merchant, the real local UI at 5173 successfully loaded the store home and reservation setup. For the selected store, availability #6 loaded saved terms into the updated editor: Asia/Seoul, cancellable, cutoff 60 minutes. Price inputs/undefined drafts were absent. The editor was closed without submitting; no credentials were supplied or extracted. This verifies authenticated merchant reads and existing-value rendering, not live PUT success or UTC/KST correctness (#298).
- No operating data was modified during verification. Commit/push/PR publication is separate from live reservation writes.
- Not run: Docker image, full release browser suite, Safari/Firefox, physical mobile/touch. Font requests are blocked in the terms fixture, so screenshots do not verify production icon/font pixels.
