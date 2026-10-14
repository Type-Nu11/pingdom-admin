# Merchant onboarding contract (#203)

## Entry points

- USER login continues to `/merchant/onboarding`.
- Existing-place and new-place application routes allow authenticated USER and MERCHANT_OWNER accounts. ADMIN and unknown roles remain excluded.
- USER application pages have only application navigation; operating routes retain MerchantProtectedRoute.
- MERCHANT_OWNER application pages retain the existing merchant layout.

## APIs

- Profile lookup uses `GET /users/me/merchant-owner-profile`, not the approved-owner-only `/merchant-owner/me`.
- Only a direct 404 with `code: PROFILE_NOT_FOUND` means no profile. Generic 404, refresh failures, 401/403 and server errors remain errors.
- Existing PENDING/REJECTED/REVOKED profile data stays visible; it is not canceled or modified by visiting onboarding.
- The original profile POST/PUT clients are retained, but no longer prerequisites for unified applications.
- Existing unified application forms collect business information and attachments and use `/users/me/merchant-place-applications` for save, submit, cancel and reopen.
- Removed `/users/me/merchant-verification` GET/POST/PUT clients and the separate verification form/types.
- An ACTIVE profile with a USER token prompts re-login. The frontend never assigns MERCHANT_OWNER based solely on a profile response.

Server reference: `MerchantPlaceApplicationService` on pingdom-api develop prepares the merchant profile/verification and activates the owner role during unified approval. This code check is not authenticated production QA.

## Verification

- `npm test`, `npm run lint`, `npm run build`, `git diff --check`.
- `node tests/browser/onboarding.mjs` starts and closes its own Vite server and Chromium. It uses a synthetic USER context, intercepts API reads, and prohibits mutation requests.
- Browser checks at 1280px and 390px cover USER operating-route rejection, both application entries, application-only navigation, all four direct-profile states and stale-role re-login guidance.
- Screenshots are emitted to a temporary directory. External map access is blocked, so map loading failure is expected and not a map integration pass.
- Real application submission, attachments, approval, token re-login and live map interaction were not executed. Existing form behavior is reused, not certified end-to-end by these checks.
