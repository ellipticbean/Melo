# Melo Gowon Port — Migration Status

## Goal
Make Melo a close successor to Gowon, preserving the upstream command framework, behavior, dependencies, database architecture, and integrations as closely as practical. The intentional gameplay exception is replacing Fishy with a frog-pond/nature collection system in a later, separate phase.

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
3. Reproduce the original build/runtime and database requirements before rebranding or modifying game code.
4. Inventory companion services and external endpoints, then restore or replace them only when needed.
5. Rebrand to Melo while preserving command behavior.
6. Replace Fishy with Frog Pond in a dedicated phase, including database migration decisions.
7. Run builds and feature checks before considering any production deployment.

## Architecture notes
The upstream package uses TypeScript 4.6, CommonJS output, discord.js 13, TypeORM, PostgreSQL, Redis, Docker Compose, and multiple configured companion-service URLs. The bot repository alone may not provide every external service. Do not remove integrations simply because their services are not yet running.

## Security
- Never commit real bot tokens, Last.fm/Spotify secrets, GitHub tokens, database passwords, or live configuration.
- Use example configuration files in Git and secrets/environment configuration at runtime.
- Do not deploy a production bot or migrate a production database until local build, configuration, and integration checks pass.

## Current phase
Pinned Gowon source import is complete on `gowon-port`. The imported snapshot contains 1,143 repository-tree entries, including the original source, assets, configuration examples, Docker setup, tests, and AGPL license. The original Melo `main` branch remains untouched. Next: finish Frog Pond command/UI conversion, validate the new discovery data, and continue companion-service deployment planning. No live deployment has been attempted.
