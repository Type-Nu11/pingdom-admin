# Merchant reservation terms QA (#256)

## Contract

- Checked `https://www.typenull.xyz/v3/api-docs/merchant` on 2026-10-02.
- GET `/merchant-owner/availabilities` supplies nullable `reservationTerms` and `conditionsVersion`.
- PUT `/merchant-owner/availabilities/{availabilityId}/reservation-terms` saves minor-unit integer prices, currency, IANA timezone and cancellation policy.
- Additional amount applies once per reservation. Noncancellable requests send a null cutoff. Allowed cancellation requires an integer cutoff in minutes (including zero).
- Existing accepted reservation snapshots are not edited by this screen.

## Coverage

- `node --test tests/merchant-reservation-terms.test.mjs`: unset versus free/noncancellable, exact payload, invalid amounts/currency/timezone/cutoff, saved-value/version reload, HTTP 400/401/403/500, single-flight mutation, stale/wrong-place target, account switch, input retention, and schedule/status preservation.
- `node tests/browser/reservation-terms.mjs`: 1920x1080, 1366x768 and 390x844; modal bounds, input retention after failed writes, unsaved dismissal confirmation, pending dismissal guard, reload persistence and recovery after a successful write followed by a failed query.
- Browser fixture replaces the Axios adapter and blocks non-local network access. Its saved rows are synthetic sessionStorage data, not real reservations.
- A successful PUT followed by a failed GET remains a successful save. Returned terms remain visible, but further edits are blocked until the authoritative list/version is fetched again. Auth errors clear or hide inaccessible results.

## Limitations

- No production reservation terms, quotes, payments, cancellations or refunds were changed.
- Live authenticated read/write and server-side authorization QA remain necessary on an explicitly designated test availability.
- Screenshots are emitted to the temporary directory reported by the browser test. Temporary browsers and Vite servers are closed in `finally`.
