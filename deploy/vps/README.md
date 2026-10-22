# VPS deployment preparation

This runbook targets a small **DigitalOcean Droplet running Ubuntu 24.04 LTS** and Docker Compose. It is an infrastructure preparation guide, not a claim that Melo is already deployed.

## Recommended starting size

Start with **2 vCPUs, 4 GiB RAM, and at least 80 GiB SSD** for a low-traffic pilot. DigitalOcean currently lists a 4 GiB / 2 vCPU Basic Droplet at about **$24/month**; confirm the checkout price and any taxes before creating it. This is a starting point, not a guarantee that every companion service will fit comfortably. If memory pressure appears once Lilac and Mirrorball are running, resize to 8 GiB before inviting a wider community.

- Provider: [DigitalOcean Droplets](https://www.digitalocean.com/products/droplets)
- Image: Ubuntu 24.04 LTS
- Region: New York, if available to your account
- Authentication: SSH key; do not enable password SSH
- Backups: enable provider backups or arrange off-server database backups
- Firewall: allow SSH (22), HTTP (80), and HTTPS (443) only. Do not expose PostgreSQL (5432), Redis (6379), or the bot's internal HTTP port (3000) publicly.

## What is and isn't ready

The gowon-port branch builds and its current CI validates the Melo container, Compose syntax, tests, and PostgreSQL migrations. The current root Compose file starts **Melo + PostgreSQL + Redis only**. A faithful live deployment still needs separately configured Mirrorball and Lilac; other integrations (Doughnut, Pantomime, Supernova, Spotify OAuth and public webhooks) should be enabled only after their own config/endpoints are verified. See [COMPANION_SERVICES.md](../../docs/COMPANION_SERVICES.md).

Do not advertise full Gowon feature parity until the companion services have been deployed and tested. Do not use any upstream operator's private credentials or live database.

## Provision the server

1. Create the Droplet in the provider dashboard using the settings above.
2. In the Droplet's **User data** field, paste the contents of [cloud-init.yaml](./cloud-init.yaml). It installs Docker/Compose and configures a basic host firewall. It does not deploy Melo or create credentials.
3. Wait for first boot to finish, then SSH into the server as the default Ubuntu user.
4. Check setup:

       docker --version
       docker compose version
       sudo ufw status verbose

5. Clone the repo and select the prepared branch:

       git clone --branch gowon-port --single-branch https://github.com/ellipticbean/Melo.git
       cd Melo

## Configure runtime secrets on the server

Create files on the server; do not commit them or paste secrets into chat.

1. Copy .env.example to .env; set a unique, long random POSTGRES_PASSWORD.
2. Copy config.example.json to config.json. Set your own Discord bot token and client ID, Last.fm API key/secret, and set environment to production. Set redisHost to redis for Compose.
3. Set mirrorballURL, lilacURL, lilacWebsocket, passwords, and optional integration URLs only after those services are deployed on a private Docker network. Do not leave the example host.docker.internal endpoints in a remote Linux deployment.
4. Copy src/lib/specialUsers.example.json to src/lib/specialUsers.json; remove example entries and enter your own Discord user/bot IDs.
5. Verify config.json, ormconfig.ts, and src/lib/specialUsers.json remain untracked by Git.

Before starting the bot, deploy/configure Mirrorball and Lilac according to their upstream instructions and ensure they can reach their own database/Redis dependencies. The companion-service setup is a separate step; the root Compose file does not start them.

## First launch sequence

After companion endpoints and credentials have been verified:

    docker compose config
    docker compose up -d postgres redis
    docker compose run --rm melo yarn migrate
    docker compose up --build -d melo
    docker compose ps
    docker compose logs --tail=200 melo

Run this first in a private test Discord server. Verify startup, !help, account linking, recent tracks, charts, and any feature whose companion is online before inviting more users. If the bot exits or repeatedly logs errors, stop and inspect logs rather than repeatedly recreating containers.

## Safe operations

- Keep SSH access enabled before enabling UFW; the supplied cloud-init opens port 22 before turning the firewall on.
- Do not open 3000 to the public internet by default. OAuth callbacks/webhooks need a separately configured HTTPS reverse proxy and real domain.
- Do not expose the database or Redis ports.
- Configure and test backups before storing real user data.
- Update by reviewing the branch/PR and CI first, then pull the intended commit and rebuild. Do not blindly deploy every push to a draft branch.
- Never merge the draft PR or switch production traffic without an explicit review and a successful live test.
