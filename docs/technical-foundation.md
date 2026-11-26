# Extended technical foundation

The existing bundle remains the runtime source. EXTENDED_BALANCE at its beginning centralizes selected prestige, ascension, enemy growth and skeleton XP values without intentionally changing arithmetic. Not every economy parameter is centralized yet. The four known balance defects remain TODO tests.

EXTENDED_STORAGE defines three distinct localStorage keys. Existing legacy keys are untouched. Start a new game or export from the original version and import manually through the existing import UI. Back up saves first. The import path and browser reset behavior still require integration testing. No automatic migration is performed. Upstream PlayFab login is disabled to avoid writes to the original cloud account; no new cloud service is configured.

Run node --test tests/balance.test.mjs and node --check dist/bundle.js. CI runs on develop. Full browser smoke tests, save round-trips and remaining economy audit are outstanding. Do not deploy modified game until licensing is verified.
