# Oracle Cloud Always Free deployment

This is the recommended first hosting attempt for Melo because it can provide an ARM-based Ubuntu VM at **$0/month within Oracle's Always Free limits**. It is a preparation/runbook, not proof that an instance has been provisioned or that the complete Gowon companion stack works on ARM64.

Official limits and caveats: [Oracle Always Free resources](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm).

## Important: keep the bill at $0

- During signup, choose a home region you can use long-term. Always Free compute must be created in that home region.
- Create only resources explicitly marked **Always Free eligible**. Do not upgrade the account, create paid resources, or accept a paid estimate as part of this walkthrough.
- The target is one **VM.Standard.A1.Flex** VM with **2 OCPUs and 12 GB memory** (the current total Always Free A1 allowance), Ubuntu 24.04 ARM64, and a **50 GB boot volume**. The boot volume counts against the 200 GB Always Free block-volume allowance.
- Oracle may ask for a payment card for identity verification; its documentation says the card is not charged unless the account is upgraded. Never add a paid resource just to get past a capacity error.
- A1 capacity can be unavailable in a home region. If you see “Out of host capacity,” try another availability domain in the same home region or retry later; do not switch to a non-free shape.
- Oracle can reclaim idle Always Free compute. Their published test looks at CPU, network and (for A1) memory utilization over a seven-day period. Free hosting is not a guarantee of uninterrupted uptime.
- We will not use Oracle's trial credits or any paid services as part of this plan.

## 1. Create the Oracle account and VM

1. Open [Oracle Cloud Free Tier](https://www.oracle.com/cloud/free/) and complete signup yourself. Account verification and payment-card verification, if requested, must be done by you.
2. In the OCI Console, note your **home region**. Do not create the VM in a different region expecting it to count as Always Free.
3. Open **Compute → Instances → Create instance**.
4. Name it `melo-free`.
5. Choose an Ubuntu 24.04 image labelled **Always Free eligible**. Make sure the image architecture is **aarch64 / ARM64**, not AMD64/x86.
6. Under Shape, choose **Ampere → VM.Standard.A1.Flex**. Set **2 OCPUs** and **12 GB memory**. Confirm the console still labels the shape Always Free eligible and shows no paid charge before proceeding.
7. Use the default 50 GB boot volume (or another size within the Always Free storage limit). Do not add paid block volumes.
8. Add an SSH public key you control. Prefer generating a dedicated key on your own PC; never upload or share the private key. If you do not already have one in Windows PowerShell, you can generate it locally with:
   
       ssh-keygen -t ed25519 -a 64 -f "$HOME\\.ssh\\melo_oracle"

   Keep the private key on your computer. Paste only the contents of `melo_oracle.pub` into Oracle.
9. For networking, create/select a public subnet and assign a public IPv4 address if you want to SSH in directly. In the subnet's security list (and any network security group attached to the VM), allow inbound **TCP 22** from your current public IP where practical. Later, allow **80 and 443** only if public HTTPS integrations are actually needed. Do not allow public inbound access to PostgreSQL 5432, Redis 6379, or Melo port 3000.
10. Before clicking Create, re-check the shape, architecture, home region and any estimated cost. Stop if the console proposes a paid resource.

## 2. Bootstrap the Ubuntu host

Once the VM is running, copy the contents of [cloud-init.yaml](./cloud-init.yaml) into the instance's **User data / cloud-init** field when creating the instance. If you have already created the VM without user data, you can run the same package setup manually over SSH instead; cloud-init normally runs on first boot only.

The cloud-init file installs Docker, Docker Compose, Git, UFW and Fail2ban. It does not clone the repository, create tokens, or start the bot.

SSH from Windows PowerShell (replace the address with the VM's public IP):

    ssh -i "$HOME\\.ssh\\melo_oracle" ubuntu@YOUR_PUBLIC_IP

Then verify:

    docker --version
    docker compose version
    sudo ufw status verbose
    uname -m

The architecture should report `aarch64`. If SSH fails, check the OCI subnet/security-list rules, the VM's public IP and the local private-key path. Do not disable the firewall wholesale to troubleshoot.

## 3. Clone and configure Melo

The draft `gowon-port` branch is the current working port. The draft pull request has not been merged, and `main` remains untouched.

    git clone --branch gowon-port --single-branch https://github.com/ellipticbean/Melo.git
    cd Melo
    cp .env.example .env
    cp config.example.json config.json
    cp ormconfig.ts.example ormconfig.ts
    cp src/lib/specialUsers.example.json src/lib/specialUsers.json

Edit the files on the VM with a terminal editor such as `nano`. Use your own Discord bot token/client ID and Last.fm API credentials. Set a long unique PostgreSQL password in `.env`; set `redisHost` to `redis`, `environment` to `production`, and fill `lastFMStatusUsername`. Configure your own Discord IDs in `specialUsers.json`. Do not paste secrets into GitHub issues, commits, or chat.

Before running the bot, inspect the Compose config and make sure the bot's internal port is bound to localhost:

    docker compose config
    docker compose up -d postgres redis
    docker compose run --rm melo yarn migrate
    docker compose up --build -d melo
    docker compose ps
    docker compose logs --tail=200 melo

The root Compose file is designed for a Docker-capable Linux host and binds port 3000 to localhost. If Compose reports an image/platform or native dependency error on ARM64, stop and fix compatibility before proceeding; do not force an AMD64 image as a workaround on this small free VM.

## 4. Feature-parity work still required

The current Compose stack starts **Melo + PostgreSQL + Redis only**. A faithful live Gowon-style deployment still needs companion services, especially **Mirrorball and Lilac**. Doughnut, Pantomime, Supernova, Spotify OAuth, public webhooks and any website/API integration need their own review and configuration too. See [COMPANION_SERVICES.md](../../docs/COMPANION_SERVICES.md).

The next engineering step is to validate the entire required stack on ARM64, identify/build ARM64-compatible images, and connect the services on a private Docker network. Do not claim full feature parity until the dependent features have been tested end to end. The instance should first be used with a private test Discord server.

## 5. Backups and ongoing safety

- Keep SSH keys private and restrict port 22 to your IP when possible.
- Keep database and Redis ports private; do not publish them to the internet.
- Make and test PostgreSQL backups before storing real community data. A VM disk is not a backup.
- Check OCI **Governance & Administration → Limits, Quotas and Usage** and cost/usage pages periodically.
- Do not click Upgrade or provision resources outside the Always Free allowance. If the console shows any paid resource, stop and review it first.
- Keep the draft PR unmerged until CI and live tests pass. Review updates before pulling them onto the server.
