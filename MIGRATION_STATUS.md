# Melo Gowon Port — Migration Status

## Goal
Make Melo a close successor to Gowon, preserving the upstream command framework, behavior, dependencies, database architecture, and integrations as closely as practical. The intentional gameplay exception is replacing Fishy with Frog Pond, a frog-pond/nature collection system.

## Source baseline
- Upstream repository: https://github.com/gowon-bot/gowon
- Default branch observed: `main`
- Pinned source commit: `256e728ab446dbfe942915acb94e494a4b6d37b0`
- Commit message: `Fix nightmare fishy quests`
- Commit date: 2025-11-07
- License: AGPL-3.0-or-later; retain the upstream LICENSE and notices.

No tagged release was returned by the repository releases endpoint. This migration therefore pins an explicit commit rather than a floating branch.

## Strategy
1. Keep `main` untouched as the rollback point for the existing Melo implementation.
2. Import the pinned Gowon source into `gowon-port`.
3. Reproduce the original build/runtime and database requirements while retaining the upstream dependency versions.
4. Inventory companion services and external endpoints, then restore or replace them only when needed.
5. Rebrand the bot while preserving command behavior.
6. Replace the Fishy gameplay with Frog Pond while retaining the original progression framework and database schema.
7. Validate CI on Node 18/22 and build the Docker image before considering any production deployment.

## Architecture notes
The upstream package uses TypeScript 4.6, CommonJS output, discord.js 13, TypeORM, PostgreSQL, Redis, Docker Compose, and multiple configured companion-service URLs. Melo's Compose stack now provides the bot, PostgreSQL, and Redis. Mirrorball, Lilac, and other integrations still need separate configuration/deployment. The bot logs failed Mirrorball/Lilac connections but can continue startup; dependent features will be unavailable until those services are reachable.

## Security
- Never commit real bot tokens, Last.fm/Spotify secrets, GitHub tokens, database passwords, or live configuration.
- Use example configuration files in Git and secrets/environment configuration at runtime.
- Do not deploy a production bot or migrate a production database until local build, configuration, and integration checks pass.

## Current phase
Pinned Gowon source import and the first Frog Pond conversion are complete on `gowon-port`. The imported snapshot retains the upstream source, assets, tests, and AGPL license; Melo-facing commands, nature discovery data, and Unicode game visuals are implemented. CI has passed on Node 18 and 22, including the test suite, TypeORM migrations against PostgreSQL, Docker image build, and Docker Compose configuration validation. The original Melo `main` branch remains untouched. Next: finish companion-service deployment planning and live configuration. Draft PR #1 is open for review. No live bot deployment has been attempted.
