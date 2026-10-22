# Melo companion-service map

This map is based on the pinned Gowon source and the linked companion repositories. The bot probes Mirrorball and Lilac during startup, but failed probes are logged rather than treated as fatal. Those services are still needed for full indexing and related feature coverage.

## Core runtime dependencies

| Component | What it provides | Evidence / setup |
| --- | --- | --- |
| PostgreSQL | Persistent user, settings, crowns, game, and command data | `ormconfig.ts.example`; the included Compose stack provisions a dedicated database and CI runs migrations against PostgreSQL. |
| Redis | Runtime caching / interaction support | The included Compose stack provides Redis; `src/setup.ts` initializes it. |
| Mirrorball | GraphQL indexing and cached Last.fm data | `src/setup.ts` pings Mirrorball at `mirrorballURL`; startup continues if the ping fails, but dependent indexing features will not work. |
| Lilac | Indexing and Last.fm data API | `src/setup.ts` pings Lilac; startup continues if the ping fails, but dependent API features will not work. Upstream `gowon-bot/lilac` requires its config and database migrations and works with Mirrorball. |
| Discord application | Gateway bot and slash commands | `discordToken`, `discordClientID`; invite the bot with the required intents and permissions. |
| Last.fm API | Core Last.fm commands and user data | `lastFMAPIKey`, `lastFMSecret`. |

## Configured companion services / integrations

| Component | Likely role in the system | Deployment notes |
| --- | --- | --- |
| Doughnut | Authenticated service/API proxy with token request/destroy and `/services/:service/*` forwarding | Upstream README requires `services.yml` and `.env`; inspect call sites before deciding whether it is needed for the first release. |
| Pantomime | Chart/image-generation integration used by chart services | Configured in bot code; validate the exact endpoints and commands that depend on it. |
| Supernova | Supporting service referenced by `supernovaURL` and `supernovaPassword` | Used for error reporting; startup does not require it, but error reports will not reach it if unavailable. |
| Melo website / API | Website redirects, dashboard URLs, Spotify OAuth callback, and bot webhooks | Replace placeholder hostnames with Melo-owned endpoints when available; do not point users to the retired Gowon service. |
| Spotify | Spotify login, playlist tags, and related commands | `spotifyClientID`, `spotifyClientSecret`, and a publicly reachable OAuth redirect host are needed for those features. |
| GitHub API | Optional issue/reporting integration | `githubUsername` and `githubAuthToken`; use a narrowly scoped token only if the feature is retained. |

## Fastest faithful deployment path

1. Build the main bot and run its tests first.
2. Use the included Compose stack for PostgreSQL and Redis, or provision them separately.
3. Bring up Mirrorball and Lilac using their own repositories and documented configuration/migrations.
4. Set Melo-specific Discord and Last.fm credentials in untracked runtime configuration.
5. Start the bot in a test Discord server and validate startup, account linking, recent tracks, charts, friends, crowns, and help.
6. Restore optional integrations before claiming their dependent commands work.

## Important boundaries

- The main Gowon repository alone is not a complete self-contained production stack.
- The current Melo Compose file starts the bot, PostgreSQL, and Redis; it does not provision Mirrorball, Lilac, the website, or all other integrations.
- The bot can start if Mirrorball or Lilac is unavailable, but features that call those services will fail or return errors until they are reachable.
- Never reuse the original operator's private production secrets, databases, or OAuth credentials.
- Do not connect to any database containing the original bot's live user data without an explicit migration and authorization plan.
- Keep the original upstream license and attribution. The bot source is AGPL-3.0-or-later.
