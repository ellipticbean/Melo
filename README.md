# Melo

Melo is a Last.fm Discord bot and a community-maintained successor based on [Gowon](https://github.com/gowon-bot/gowon). This repository preserves the upstream command framework and architecture while adapting the bot for independent operation and replacing Fishy with the Frog Pond nature-collecting game.

**Status:** migration in progress. Do not use this branch as a production bot yet.

## Features

The bot includes a broad Last.fm command system, account linking, now-playing displays, charts, friends, crowns, Spotify integration, cards, help and administration commands, plus the original collection-game framework. Use `!help all` in Discord to browse available commands once configured.

## Architecture

The main bot uses TypeScript, discord.js 13, TypeORM, PostgreSQL and Redis. The original architecture also depends on companion services for indexing and cached Last.fm data.

- [Lilac](https://github.com/gowon-bot/lilac) — indexing and GraphQL API
- [Mirrorball](https://github.com/gowon-bot/mirrorball) — indexing service
- [Doughnut](https://github.com/gowon-bot/doughnut) — API gateway/proxy
- [Pantomime](https://github.com/gowon-bot/pantomime) — chart/image integration
- [Supernova](https://github.com/gowon-bot/supernova) — supporting service

The current Compose stack starts Melo, PostgreSQL, and Redis. Mirrorball, Lilac, and the other companion integrations still need their own configuration and deployment. See [the companion-service map](docs/COMPANION_SERVICES.md). See [the companion-service map](docs/COMPANION_SERVICES.md).

## Development setup

Use Node.js 22 for local development and deployment; CI checks Node.js 18 and 22. Use Yarn Classic. The TypeORM example loads `.env` for local migration commands.

1. Copy `.env.example` to `.env` and set your PostgreSQL password, then install dependencies: `yarn install --frozen-lockfile`
2. Copy `config.example.json` to `config.json`, fill in your own credentials, and set `lastFMStatusUsername` to a valid Last.fm username for the status command's latency check.
3. Copy `ormconfig.ts.example` to `ormconfig.ts` and configure a **dedicated Melo PostgreSQL database**.
4. Copy `src/lib/specialUsers.example.json` to `src/lib/specialUsers.json` and set your own developer and bot IDs; name your bot entry `melo` (and `melo development` for a separate test bot).
5. Start PostgreSQL, Redis, Mirrorball and Lilac with their required configuration.
6. Run database migrations with `yarn migrate` after verifying the database connection.
7. Build with `yarn build`; start locally with `yarn start`.

Never commit `config.json`, `ormconfig.ts`, `specialUsers.json`, bot tokens, API keys, OAuth secrets, or database passwords. The example files are safe templates, not working credentials. Do not connect Melo to the original operator's live database.

## Docker deployment

The Docker image builds from safe example files and does not bake your local configuration or secrets into the image.

1. Copy `.env.example` to `.env` and set a strong `POSTGRES_PASSWORD`.
2. Copy `config.example.json` to `config.json`, then set your Discord token/client ID and Last.fm API credentials.
3. Copy `src/lib/specialUsers.example.json` to `src/lib/specialUsers.json`; set your own Discord IDs and name your bot entry `melo`.
4. Keep `redisHost` set to `redis` for Compose. Set `lastFMStatusUsername` for the status command. Configure `mirrorballURL`, `lilacURL`, `lilacWebsocket`, passwords, and `supernovaURL` to match the companion services you have running. The defaults use `host.docker.internal` to reach services running on the host; use service names if you attach the companions to the same Docker network.
5. Start PostgreSQL and Redis: `docker compose up -d postgres redis`.
6. Run migrations: `docker compose run --rm melo yarn migrate`.
7. Start Melo: `docker compose up --build -d melo`; follow logs with `docker compose logs -f melo`.

The main bot still requires the companion indexing services Mirrorball and Lilac to be reachable at startup. The Compose file provides PostgreSQL and Redis, but does not pretend to deploy those companion projects automatically. Before enabling Spotify OAuth or public webhooks, set `spotifyRedirectHost` and API/website URLs to your real public HTTPS address.

## Upstream source and attribution

Melo's initial source baseline is pinned to [Gowon commit `256e728ab446dbfe942915acb94e494a4b6d37b0`](https://github.com/gowon-bot/gowon/commit/256e728ab446dbfe942915acb94e494a4b6d37b0). The upstream project and its contributors deserve credit for the code, assets, architecture and original ideas retained here.

This repository retains the upstream **AGPL-3.0-or-later** license. See [LICENSE](LICENSE) and comply with its source-availability and notice requirements when distributing or operating modified versions.
