# Melo companion-service map

This map is based on the pinned Gowon source and the linked companion repositories. It is intentionally conservative: services marked "required at startup" are called directly by the bot's startup sequence, while optionality of other services must be verified command-by-command.

## Required for the unmodified bot startup

| Component | What it provides | Evidence / setup |
| --- | --- | --- |
| PostgreSQL | Persistent user, settings, crowns, game, and command data | `ormconfig.ts.example`; create a dedicated database and run TypeORM migrations. |
| Redis | Runtime caching / interaction support | The included Compose stack provides Redis; `src/setup.ts` initializes it. |
| Mirrorball | GraphQL indexing and cached Last.fm data | `src/setup.ts` pings Mirrorball at `mirrorballURL`; source README says to build the Mirrorball image from `gowon-bot/mirrorball`. |
| Lilac | Indexing and Last.fm data API | `src/setup.ts` pings Lilac; upstream `gowon-bot/lilac` README requires its config and database migrations and works with Mirrorball. |
| Discord application | Gateway bot and slash commands | `discordToken`, `discordClientID`; bot must be invited with the original required intents/permissions. |
| Last.fm API | Core Last.fm commands and user data | `lastFMAPIKey`, `lastFMSecret`. |

## Configured companion services / integrations

| Component | Likely role in the system | Deployment notes |
| --- | --- | --- |
| Doughnut | Authenticated service/API proxy with token request/destroy and `/services/:service/*` forwarding | Upstream README requires `services.yml` and `.env`; inspect command paths before deciding whether it is required for the initial release. |
| Pantomime | Chart/image-generation integration used by chart services | Configured in bot code; confirm exact endpoints and commands that depend on it. |
| Supernova | Supporting service referenced by `supernovaURL` and `supernovaPassword` | Its README is sparse; inspect its implementation and call sites before deployment. |
| Gowon website / API | Website redirects, dashboard URLs, Spotify OAuth callback, and bot webhooks | Replace hostnames with Melo-owned endpoints when available; do not point users to the retired Gowon service. |
| Spotify | Spotify login, playlist tags, and related commands | `spotifyClientID`, `spotifyClientSecret`, and a publicly reachable OAuth redirect host are needed for those features. |
| GitHub API | Optional issue/reporting integration | `githubUsername` and `githubAuthToken`; use a narrowly scoped token only if the feature is retained. |

## Fastest faithful deployment path

1. Build the main bot and run its tests first.
2. Use the included Compose stack for PostgreSQL and Redis, or provision them separately.
3. Bring up Mirrorball and Lilac using their own repositories and documented migrations/configuration.
4. Set Melo-specific Discord and Last.fm credentials in an untracked runtime config.
5. Start the bot in a test Discord server and validate startup, account linking, recent tracks, charts, friends, crowns, and help.
6. Restore optional services before claiming their dependent commands work.

## Important boundaries

- The main Gowon repository alone is not a complete self-contained production stack.
- The current Melo Compose file starts the bot, PostgreSQL, and Redis; it does not provision Mirrorball, Lilac, the website, or all other integrations.
- Never reuse the original operator's private production secrets, databases, or OAuth credentials.
- Do not connect to any database containing the original bot's live user data without an explicit migration and authorization plan.
- Keep the original upstream license and attribution. The bot source is AGPL-3.0-or-later.
