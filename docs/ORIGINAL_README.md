# Color Clash — browser collection v0.4.1-web

English browser adaptation of Color Clash v0.3.0. Participants use a desktop/laptop keyboard, accept the participation information, perform practice and the task, and answer untimed final questions. No PsychoPy installation, self-assigned ID or manual file return is required.

## Routes and storage

- `/`: full research task, 480 measured trials after 36 practice trials per attempt (maximum two).
- `/?mode=research_check`: informed technical check, 24 measured trials, no final questionnaire or spillover inference.
- `/?mode=demo`: separate classic Stroop demonstration, 32 measured trials.
- `/?mode=experiment`: separate classic Stroop pilot, 128 measured trials in two blocks.
- `/research`: organiser-only results view, protected by ChatGPT sign-in and an exact server-side owner email check. Anonymous participants do not sign in.

Cloudflare D1 is the authoritative store. Each session has a server-assigned ID such as `research_P001` or `demo_P001`, with a separate counter for each mode. Counter update and session creation run in one database batch. A client reservation UUID and write token make retries idempotent. Numbers belong to sessions, not verified unique humans, and are consumed by incomplete/test/withdrawn sessions too. They are never reused. Individual exports are named `MODE_PNNN.json` and `MODE_PNNN_trials.csv`.

Completed trials are locally buffered between trials and uploaded in ordered batches. A final receipt appears only after server acknowledgement. Browser-local pending storage is a temporary retry buffer, not the authoritative result store. Participants can retry uploading an interrupted session after a refresh; the measured experiment itself is not resumed midway. Clearing that browser’s storage before acknowledgement can lose unsent responses. Automatic saving cannot guarantee survival of every device/power failure.

Server validation reconstructs the seeded schedule, enforces trial order and practice eligibility, computes correctness/RT flags itself, rejects conflicting retries, and prevents incomplete tasks being marked complete. Final questions are saved separately, preserving complete timed data when the questionnaire is skipped. CSV exports include session ID, mode, version, seed and prior-knowledge labels. JSON also contains exact schedules and diagnostics. Source requests must be same-origin; subsequent writes require the private session token. Public IDs do not grant access to raw results.

Server-side researcher authorization uses `RESEARCH_OWNER_EMAIL`, managed as a hosted secret. Local `.env` / `.dev.vars` files are ignored. No secret, participant result or production database is committed. Do not expose the results API or remove its owner check when making the participant page public.

## Scientific continuity and changes

Read `PROTOCOL_WEB.md`. A JavaScript implementation of Python’s integer/string-seeded MT19937 and shuffling reproduces measured and practice schedules exactly for the checked independent Python fixtures. Trial counts, contingencies, keys, RGB values, feedback policy, practice threshold and the primary median contrast are preserved. The drawing/timestamp system changed: canvas, requestAnimationFrame and KeyboardEvent timestamps replace PsychoPy/ioHub. Browser timing is therefore a new measurement implementation, not externally calibrated native timing. Keep v0.4.1-web data separate from the earlier desktop personal pilot until justified cross-version comparisons are specified.

Nationality is not collected. Written-English comprehension and adulthood are confirmed for participation; prior exposure is recorded. No identity-based cognitive conclusions or diagnoses are produced.

## Verification and local development

Dependency versions are in `package.json` and `pnpm-lock.yaml`; preserve the starter’s build and hosting helpers. D1 migrations are generated from `db/schema.ts` and kept in `drizzle/`. Applied migrations are immutable; append new ones after later schema changes.

After dependency installation and the normal Sites build:

```sh
node node_modules/typescript/bin/tsc --noEmit --incremental false
node --experimental-strip-types tests/verification.mjs
node --experimental-strip-types tests/engine.mjs
node --experimental-strip-types tests/server.mjs
node tests/upload.mjs
```

Test runner: Node 24.19.0. Schedule verification uses 12 measured and 24 practice fixtures generated independently with Python from desktop v0.3.0, including seed 0, 42 and 2**32−1. Mock frame-clock tests check first response, wrong-first, anticipatory responses, deadline handling and interruption. Disposable Miniflare tests exercise the actual built Worker and D1, including concurrent IDs, concurrent duplicate reservations, ordered/full saves, duplicate/conflicting uploads, incomplete-task rejection, questionnaire, optional demographic validation/skips, private exports and withdrawal. A mock-network upload test checks failed demographic submission and recovery with the same session code. Test data are labelled synthetic and never written to production.

The supervised preview was unavailable because of an environment startup failure. No cloud-browser visual/end-to-end test is claimed. Before volunteer collection, an informed organiser should run the short browser check on actual Mac and Windows devices, verify the server receipt and export, then complete one full browser check including the questionnaire. The earlier successful Mac PsychoPy run does not establish browser functionality on those devices. Automated timing tests do not establish physical display or key latency.

The optional `get_color_clash_status` WebMCP tool is read-only and feature-detected. It cannot supply human task responses. Registration and interaction verification were unavailable in a permitted WebMCP browser context; it is not required for participants.

## Attribution and boundaries

AI-assisted source and documentation; Bako should inspect, understand and describe her contribution honestly. This is a small educational exploratory project, with no claim of clinical validation, a novel general paradigm, formal model selection in humans, or a neural measurement. Raw human results remain private. Consent, any applicable course requirements, a convenience recruitment target and a stopping date should be established before volunteer collection. The scientific stopping rule must not depend on an attractive effect. Informed and repeated sessions remain separate from first-session participants.

Background timing reference: Anwyl-Irvine et al. (2021), *Realistic precision and accuracy of online experiment platforms, web browsers, and devices*, DOI 10.3758/s13428-020-01501-5. It supports attention to device/browser differences, not validation of this implementation.

## Optional demographics (0.4.1-web)

After the timed task and any awareness questionnaire, participants may report an adult age band and self-described gender. Each field can be blank or explicitly declined; both can be skipped. The short technical check includes the same page. Collection is disclosed before consent. These answers stay attached to the existing session ID in the private database, appear in JSON and CSV exports and the organiser dashboard, and are removed by session withdrawal. No exact age or date of birth is requested. Gender is not a measure of sex assigned at birth.

An absent demographics object means no form submission (including older sessions). A submitted object with null fields records skipped questions. The explicit `prefer_not_to_say` category is kept distinct. CSV includes `demographics_submitted`, `age_group`, and `gender`. Missing or declined demographics do not exclude otherwise usable task responses. Report sample counts and missingness; avoid claims about age or gender differences from sparse convenience-sample subgroups, and do not add these as automatic covariates. The additive migration preserves earlier sessions and trial records.
