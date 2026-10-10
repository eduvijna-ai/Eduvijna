#!/usr/bin/env node
/** Harmless child for wrapper tests — prints selected env vars as JSON. */
console.log(
  JSON.stringify({
    EDUVIJNA_API_ENV: process.env.EDUVIJNA_API_ENV ?? null,
    EDUVIJNA_REQUIRE_PRODUCTION: process.env.EDUVIJNA_REQUIRE_PRODUCTION ?? null,
  }),
);
