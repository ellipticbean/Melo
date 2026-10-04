import "dotenv/config";

import {
    Client,
    EmbedBuilder,
    Events,
    GatewayIntentBits,
    MessageFlags,
    REST,
    Routes,
    SlashCommandBuilder,
} from "discord.js";

import {
    getFmConfig,
    getLastFmUser as getSavedLastFmUser,
    resetFmConfig,
    saveFmConfig,
    saveLastFmUser,
} from "./database.js";

import {
    FM_COMPONENTS,
    normalizeFmConfig,
    renderFmFooter,
} from "./fmConfig.js";

import {
    getArtistInfo,
    getLastFmUser as fetchLastFmUser,
    getRecentTrack,
    getRecentTracks,
    getTopArtists,
    getTrackInfo,
    type TopArtistPeriod,
} from "./lastfm.js";

function requireEnv(name: string): string {
    const value =
        process.env[name];

    if (!value) {
        throw new Error(
            `${name} is missing from .env`
        );
    }

    return value;
}

function humanizePeriod(
    period: TopArtistPeriod
): string {
    switch (period) {
        case "7day":
            return "over the past week";

        case "1month":
            return "over the past month";

        case "3month":
            return "over the past 3 months";

        case "6month":
            return "over the past 6 months";

        case "12month":
            return "over the past year";

        case "overall":
        default:
            return "overall";
    }
}

function pluralize(
    amount: number,
    singular: string,
    plural = `${singular}s`
): string {
    return (
        `${amount.toLocaleString()} ` +
        `${amount === 1 ? singular : plural}`
    );
}
function parseFmOptions(
    input: string
): string[] {
    return input
        .split(
            /[\s,]+/
        )
        .map(
            (item) =>
                item
                    .trim()
                    .toLowerCase()
        )
        .filter(Boolean);
}
const token =
    requireEnv("DISCORD_TOKEN");

const clientId =
    requireEnv("DISCORD_CLIENT_ID");

const guildId =
    requireEnv("DISCORD_GUILD_ID");

requireEnv("LASTFM_API_KEY");

const commands = [
    new SlashCommandBuilder()
        .setName("ping")
        .setDescription(
            "Check whether Melo is online."
        )
        .toJSON(),

    new SlashCommandBuilder()
        .setName("setuser")
        .setDescription(
            "Link your Discord account to Last.fm."
        )
        .addStringOption((option) =>
            option
                .setName("username")
                .setDescription(
                    "Your Last.fm username"
                )
                .setRequired(true)
        )
        .toJSON(),

    new SlashCommandBuilder()
        .setName("lfmuser")
        .setDescription(
            "Show the Last.fm account linked to you."
        )
        .toJSON(),

    new SlashCommandBuilder()
        .setName("fm")
        .setDescription(
            "Display your now playing or last played track."
        )
        .toJSON(),

    new SlashCommandBuilder()
        .setName("np")
        .setDescription(
            "Display your now playing or last played track."
        )
        .toJSON(),
    new SlashCommandBuilder()
        .setName("fmx")
        .setDescription(
            "Display your custom now playing or last played track."
        )
        .toJSON(),

    new SlashCommandBuilder()
        .setName("npx")
        .setDescription(
            "Display your custom now playing or last played track."
        )
        .toJSON(),

    new SlashCommandBuilder()
        .setName("npc")
        .setDescription(
            "Customize your Melo now-playing footer."
        )

        .addSubcommand(
            (subcommand) =>
                subcommand
                    .setName("view")
                    .setDescription(
                        "View your current FM configuration."
                    )
        )

        .addSubcommand(
            (subcommand) =>
                subcommand
                    .setName("set")
                    .setDescription(
                        "Replace your FM configuration."
                    )
                    .addStringOption(
                        (option) =>
                            option
                                .setName(
                                    "options"
                                )
                                .setDescription(
                                    "Example: loved artist-plays track-plays artist-tags"
                                )
                                .setRequired(
                                    true
                                )
                    )
        )

        .addSubcommand(
            (subcommand) =>
                subcommand
                    .setName("add")
                    .setDescription(
                        "Add options to your FM configuration."
                    )
                    .addStringOption(
                        (option) =>
                            option
                                .setName(
                                    "options"
                                )
                                .setDescription(
                                    "Options to add"
                                )
                                .setRequired(
                                    true
                                )
                    )
        )

        .addSubcommand(
            (subcommand) =>
                subcommand
                    .setName("remove")
                    .setDescription(
                        "Remove options from your FM configuration."
                    )
                    .addStringOption(
                        (option) =>
                            option
                                .setName(
                                    "options"
                                )
                                .setDescription(
                                    "Options to remove"
                                )
                                .setRequired(
                                    true
                                )
                    )
        )

        .addSubcommand(
            (subcommand) =>
                subcommand
                    .setName("reset")
                    .setDescription(
                        "Reset your FM configuration to Melo's default."
                    )
        )

        .toJSON(),

    new SlashCommandBuilder()
        .setName("recent")
        .setDescription(
            "Show a few of your recent tracks."
        )
        .addIntegerOption((option) =>
            option
                .setName("count")
                .setDescription(
                    "The amount of recent tracks to show"
                )
                .setMinValue(1)
                .setMaxValue(15)
                .setRequired(false)
        )
        .toJSON(),

    new SlashCommandBuilder()
        .setName("topartists")
        .setDescription(
            "Show your top artists over a given time period."
        )
        .addStringOption((option) =>
            option
                .setName("period")
                .setDescription(
                    "The time period to use"
                )
                .addChoices(
                    {
                        name: "7 days",
                        value: "7day",
                    },
                    {
                        name: "1 month",
                        value: "1month",
                    },
                    {
                        name: "3 months",
                        value: "3month",
                    },
                    {
                        name: "6 months",
                        value: "6month",
                    },
                    {
                        name: "12 months",
                        value: "12month",
                    },
                    {
                        name: "Overall",
                        value: "overall",
                    }
                )
                .setRequired(false)
        )
        .addIntegerOption((option) =>
            option
                .setName("count")
                .setDescription(
                    "The number of entries to show"
                )
                .setMinValue(1)
                .setMaxValue(25)
                .setRequired(false)
        )
        .toJSON(),
];

const rest =
    new REST({
        version: "10",
    }).setToken(token);

async function registerCommands() {
    console.log(
        "Registering Melo's slash commands..."
    );

    await rest.put(
        Routes.applicationGuildCommands(
            clientId,
            guildId
        ),
        {
            body: commands,
        }
    );

    console.log(
        "Slash commands registered."
    );
}

const client =
    new Client({
        intents: [
            GatewayIntentBits.Guilds,
        ],
    });

client.once(
    Events.ClientReady,
    (readyClient) => {
        console.log(
            `Melo is online as ${readyClient.user.tag}`
        );
    }
);

client.on(
    Events.InteractionCreate,
    async (interaction) => {
        if (
            !interaction.isChatInputCommand()
        ) {
            return;
        }

        try {
            // =================================================
            // /ping
            // =================================================

            if (
                interaction.commandName ===
                "ping"
            ) {
                await interaction.reply(
                    `Pong! ${client.ws.ping}ms`
                );

                return;
            }

            // =================================================
            // /setuser
            // =================================================

            if (
                interaction.commandName ===
                "setuser"
            ) {
                const username =
                    interaction.options
                        .getString(
                            "username",
                            true
                        )
                        .trim();

                await interaction.deferReply({
                    flags: MessageFlags.Ephemeral,
                });

                const lastFmUser =
                    await fetchLastFmUser(
                        username
                    );

                saveLastFmUser(
                    interaction.user.id,
                    lastFmUser.name
                );

                const playcount =
                    Number(
                        lastFmUser.playcount
                    ).toLocaleString();

                await interaction.editReply(
                    `Linked your Discord account to **${lastFmUser.name}** on Last.fm.\n` +
                    `Total scrobbles: **${playcount}**`
                );

                return;
            }

            // =================================================
            // /lfmuser
            // =================================================

            if (
                interaction.commandName ===
                "lfmuser"
            ) {
                const username =
                    getSavedLastFmUser(
                        interaction.user.id
                    );

                if (!username) {
                    await interaction.reply({
                        content:
                            "You haven't linked a Last.fm account yet. Use `/setuser username:` first.",
                        flags: MessageFlags.Ephemeral,
                    });

                    return;
                }

                const lastFmUser =
                    await fetchLastFmUser(
                        username
                    );

                const playcount =
                    Number(
                        lastFmUser.playcount
                    ).toLocaleString();

                const embed =
                    new EmbedBuilder()
                        .setColor(
                            0xd92323
                        )
                        .setTitle(
                            lastFmUser.name
                        )
                        .setURL(
                            lastFmUser.url
                        )
                        .setDescription(
                            `**${playcount}** scrobbles`
                        )
                        .setFooter({
                            text:
                                "Last.fm account linked to Melo",
                        });

                await interaction.reply({
                    embeds: [
                        embed,
                    ],
                });

                return;
            }

            // =================================================
            // /fm + /np
            // =================================================

            if (
                interaction.commandName ===
                "fm" ||
                interaction.commandName ===
                "np"
            ) {
                const username =
                    getSavedLastFmUser(
                        interaction.user.id
                    );

                if (!username) {
                    await interaction.reply({
                        content:
                            "You haven't linked a Last.fm account yet. Use `/setuser username:` first.",
                        flags: MessageFlags.Ephemeral,
                    });

                    return;
                }

                await interaction.deferReply();

                const track =
                    await getRecentTrack(
                        username
                    );

                if (!track) {
                    await interaction.editReply(
                        `I couldn't find any recent tracks for **${username}**.`
                    );

                    return;
                }

                const [
                    lastFmUser,
                    artistInfo,
                ] =
                    await Promise.all([
                        fetchLastFmUser(
                            username
                        ),

                        getArtistInfo(
                            username,
                            track.artist
                        ).catch(
                            (error) => {
                                console.error(
                                    "Could not load artist info:",
                                    error
                                );

                                return null;
                            }
                        ),
                    ]);

                const artistName =
                    artistInfo?.name ??
                    track.artist;

                const artistDisplay =
                    artistInfo?.url
                        ? `[**${artistName}**](${artistInfo.url})`
                        : `**${artistName}**`;

                const description =
                    `by ${artistDisplay}` +
                    (
                        track.album
                            ? ` from *${track.album}*`
                            : ""
                    );

                const footerStats:
                    string[] = [];

                if (artistInfo) {
                    footerStats.push(
                        pluralize(
                            artistInfo
                                .userPlaycount,
                            `${artistName} scrobble`,
                            `${artistName} scrobbles`
                        )
                    );
                }

                const totalScrobbles =
                    Number(
                        lastFmUser.playcount
                    );

                footerStats.push(
                    pluralize(
                        totalScrobbles,
                        "total scrobble",
                        "total scrobbles"
                    )
                );

                let footerText =
                    footerStats.join(
                        " • "
                    );

                if (
                    artistInfo &&
                    artistInfo.tags.length > 0
                ) {
                    const tags =
                        artistInfo.tags
                            .map(
                                (tag) =>
                                    tag.toLowerCase()
                            )
                            .join(
                                " • "
                            );

                    footerText +=
                        `\n${tags}`;
                }

                const status =
                    track.nowPlaying
                        ? `Now playing for ${username}`
                        : `Last scrobbled for ${username}`;

                const embed =
                    new EmbedBuilder()
                        .setColor(
                            0x000000
                        )
                        .setAuthor(
                            lastFmUser.url
                                ? {
                                    name:
                                        status,
                                    url:
                                        lastFmUser.url,
                                }
                                : {
                                    name:
                                        status,
                                }
                        )
                        .setTitle(
                            track.name
                        )
                        .setDescription(
                            description
                        )
                        .setFooter({
                            text:
                                footerText,
                        });

                if (track.url) {
                    embed.setURL(
                        track.url
                    );
                }

                if (track.imageUrl) {
                    embed.setThumbnail(
                        track.imageUrl
                    );
                }

                await interaction.editReply({
                    embeds: [
                        embed,
                    ],
                });

                return;
            }
            // =================================================
            // /fmx + /npx
            // =================================================

            if (
                interaction.commandName ===
                "fmx" ||
                interaction.commandName ===
                "npx"
            ) {
                const username =
                    getSavedLastFmUser(
                        interaction.user.id
                    );

                if (!username) {
                    await interaction.reply({
                        content:
                            "You haven't linked a Last.fm account yet. Use `/setuser username:` first.",
                        flags: MessageFlags.Ephemeral,
                    });

                    return;
                }

                await interaction.deferReply();

                const track =
                    await getRecentTrack(
                        username
                    );

                if (!track) {
                    await interaction.editReply(
                        `I couldn't find any recent tracks for **${username}**.`
                    );

                    return;
                }

                const [
                    lastFmUser,
                    artistInfo,
                    trackInfo,
                ] =
                    await Promise.all([
                        fetchLastFmUser(
                            username
                        ),

                        getArtistInfo(
                            username,
                            track.artist
                        ).catch(
                            (error) => {
                                console.error(
                                    "Could not load artist info:",
                                    error
                                );

                                return null;
                            }
                        ),

                        getTrackInfo(
                            username,
                            track.artist,
                            track.name
                        ).catch(
                            (error) => {
                                console.error(
                                    "Could not load track info:",
                                    error
                                );

                                return null;
                            }
                        ),
                    ]);

                const artistName =
                    artistInfo?.name ??
                    track.artist;

                const artistDisplay =
                    artistInfo?.url
                        ? `[**${artistName}**](${artistInfo.url})`
                        : `**${artistName}**`;

                const description =
                    `by ${artistDisplay}` +
                    (
                        track.album
                            ? ` from *${track.album}*`
                            : ""
                    );

                // Load this Discord user's saved
                // custom FM configuration.
                const fmConfig =
                    getFmConfig(
                        interaction.user.id
                    );

                const footerText =
                    renderFmFooter(
                        fmConfig,
                        {
                            artistName,

                            trackName:
                                track.name,

                            artistInfo,

                            trackInfo,

                            totalScrobbles:
                                Number(
                                    lastFmUser.playcount
                                ),
                        }
                    );

                const status =
                    track.nowPlaying
                        ? `Now playing for ${username}`
                        : `Last scrobbled for ${username}`;

                const embed =
                    new EmbedBuilder()
                        .setColor(
                            0x000000
                        )
                        .setAuthor(
                            lastFmUser.url
                                ? {
                                    name:
                                        status,
                                    url:
                                        lastFmUser.url,
                                }
                                : {
                                    name:
                                        status,
                                }
                        )
                        .setTitle(
                            track.name
                        )
                        .setDescription(
                            description
                        );

                if (track.url) {
                    embed.setURL(
                        track.url
                    );
                }

                if (track.imageUrl) {
                    embed.setThumbnail(
                        track.imageUrl
                    );
                }

                if (footerText) {
                    embed.setFooter({
                        text:
                            footerText,
                    });
                }

                await interaction.editReply({
                    embeds: [
                        embed,
                    ],
                });

                return;
            }
            // =================================================
            // /npc
            // =================================================

            if (
                interaction.commandName ===
                "npc"
            ) {
                const subcommand =
                    interaction.options
                        .getSubcommand();

                const userId =
                    interaction.user.id;

                // ---------------------------------------------
                // /npc view
                // ---------------------------------------------

                if (
                    subcommand ===
                    "view"
                ) {
                    const config =
                        getFmConfig(
                            userId
                        );

                    const display =
                        config.length > 0
                            ? config
                                .map(
                                    (component) =>
                                        `\`${component}\``
                                )
                                .join(", ")
                            : "*Empty configuration*";

                    const embed =
                        new EmbedBuilder()
                            .setColor(
                                0x000000
                            )
                            .setTitle(
                                "Your now-playing config"
                            )
                            .setDescription(
                                display
                            )
                            .setFooter({
                                text:
                                    "This configuration is used by /fmx and /npx.",
                            });

                    await interaction.reply({
                        embeds: [
                            embed,
                        ],
                        flags: MessageFlags.Ephemeral,
                    });

                    return;
                }

                // ---------------------------------------------
                // /npc reset
                // ---------------------------------------------

                if (
                    subcommand ===
                    "reset"
                ) {
                    resetFmConfig(
                        userId
                    );

                    const config =
                        getFmConfig(
                            userId
                        );

                    await interaction.reply({
                        content:
                            "Reset your FM configuration to:\n" +
                            config
                                .map(
                                    (component) =>
                                        `\`${component}\``
                                )
                                .join(", "),
                        flags: MessageFlags.Ephemeral,
                    });

                    return;
                }

                const rawInput =
                    interaction.options
                        .getString(
                            "options",
                            true
                        );

                const parsed =
                    parseFmOptions(
                        rawInput
                    );

                const valid =
                    normalizeFmConfig(
                        parsed
                    );

                const invalid =
                    parsed.filter(
                        (option) =>
                            !(
                                FM_COMPONENTS as readonly string[]
                            ).includes(option)
                    );

                if (
                    invalid.length > 0
                ) {
                    await interaction.reply({
                        content:
                            "Unknown FM option" +
                            (
                                invalid.length === 1
                                    ? ""
                                    : "s"
                            ) +
                            ": " +
                            invalid
                                .map(
                                    (option) =>
                                        `\`${option}\``
                                )
                                .join(", ") +
                            "\n\nAvailable options:\n" +
                            FM_COMPONENTS
                                .map(
                                    (component) =>
                                        `\`${component}\``
                                )
                                .join(", "),
                        flags: MessageFlags.Ephemeral,
                    });

                    return;
                }

                // ---------------------------------------------
                // /npc set
                // ---------------------------------------------

                if (
                    subcommand ===
                    "set"
                ) {
                    saveFmConfig(
                        userId,
                        valid
                    );

                    await interaction.reply({
                        content:
                            "Your new FM configuration is:\n" +
                            (
                                valid.length > 0
                                    ? valid
                                        .map(
                                            (component) =>
                                                `\`${component}\``
                                        )
                                        .join(", ")
                                    : "*Empty configuration*"
                            ),
                        flags: MessageFlags.Ephemeral,
                    });

                    return;
                }

                // ---------------------------------------------
                // /npc add
                // ---------------------------------------------

                if (
                    subcommand ===
                    "add"
                ) {
                    const current =
                        getFmConfig(
                            userId
                        );

                    const updated =
                        normalizeFmConfig([
                            ...current,
                            ...valid,
                        ]);

                    saveFmConfig(
                        userId,
                        updated
                    );

                    await interaction.reply({
                        content:
                            "Your new FM configuration is:\n" +
                            updated
                                .map(
                                    (component) =>
                                        `\`${component}\``
                                )
                                .join(", "),
                        flags: MessageFlags.Ephemeral,
                    });

                    return;
                }

                // ---------------------------------------------
                // /npc remove
                // ---------------------------------------------

                if (
                    subcommand ===
                    "remove"
                ) {
                    const current =
                        getFmConfig(
                            userId
                        );

                    const removeSet =
                        new Set(
                            valid
                        );

                    const updated =
                        current.filter(
                            (component) =>
                                !removeSet.has(
                                    component as never
                                )
                        );

                    saveFmConfig(
                        userId,
                        updated
                    );

                    await interaction.reply({
                        content:
                            "Your new FM configuration is:\n" +
                            (
                                updated.length > 0
                                    ? updated
                                        .map(
                                            (component) =>
                                                `\`${component}\``
                                        )
                                        .join(", ")
                                    : "*Empty configuration*"
                            ),
                        flags: MessageFlags.Ephemeral,
                    });

                    return;
                }
            }
            // =================================================
            // /recent
            // =================================================

            if (
                interaction.commandName ===
                "recent"
            ) {
                const username =
                    getSavedLastFmUser(
                        interaction.user.id
                    );

                if (!username) {
                    await interaction.reply({
                        content:
                            "You haven't linked a Last.fm account yet. Use `/setuser username:` first.",
                        flags: MessageFlags.Ephemeral,
                    });

                    return;
                }

                const count =
                    interaction.options
                        .getInteger(
                            "count"
                        ) ?? 5;

                await interaction.deferReply();

                const tracks =
                    await getRecentTracks(
                        username,
                        count
                    );

                if (
                    tracks.length === 0
                ) {
                    await interaction.editReply(
                        `I couldn't find any recent tracks for **${username}**.`
                    );

                    return;
                }

                let numberedTrack = 0;

                const lines =
                    tracks.map(
                        (track) => {
                            const prefix =
                                track
                                    .nowPlaying
                                    ? "`•`"
                                    : `\`${++numberedTrack}.\``;

                            const trackName =
                                track.url
                                    ? `[${track.name}](${track.url})`
                                    : track.name;

                            const firstLine =
                                `${prefix} ${trackName} by **${track.artist}**`;

                            let secondLine =
                                "";

                            if (
                                track
                                    .nowPlaying
                            ) {
                                secondLine =
                                    "Now playing";
                            } else if (
                                track
                                    .timestamp
                            ) {
                                secondLine =
                                    `<t:${track.timestamp}:t>`;
                            }

                            if (
                                track.album
                            ) {
                                secondLine +=
                                    `${secondLine ? " • " : ""}` +
                                    `from *${track.album}*`;
                            }

                            return secondLine
                                ? `${firstLine}\n${secondLine}`
                                : firstLine;
                        }
                    );

                const artwork =
                    tracks.find(
                        (track) =>
                            Boolean(
                                track.imageUrl
                            )
                    )?.imageUrl;

                const embed =
                    new EmbedBuilder()
                        .setColor(
                            0x000000
                        )
                        .setTitle(
                            "Your recent tracks"
                        )
                        .setDescription(
                            lines.join(
                                "\n\n"
                            )
                        );

                if (artwork) {
                    embed.setThumbnail(
                        artwork
                    );
                }

                await interaction.editReply({
                    embeds: [
                        embed,
                    ],
                });

                return;
            }

            // =================================================
            // /topartists
            // =================================================

            if (
                interaction.commandName ===
                "topartists"
            ) {
                const username =
                    getSavedLastFmUser(
                        interaction.user.id
                    );

                if (!username) {
                    await interaction.reply({
                        content:
                            "You haven't linked a Last.fm account yet. Use `/setuser username:` first.",
                        flags: MessageFlags.Ephemeral,
                    });

                    return;
                }

                const period =
                    (
                        interaction.options
                            .getString(
                                "period"
                            ) ??
                        "7day"
                    ) as TopArtistPeriod;

                const count =
                    interaction.options
                        .getInteger(
                            "count"
                        ) ?? 10;

                await interaction.deferReply();

                const artists =
                    await getTopArtists(
                        username,
                        period,
                        count
                    );

                if (
                    artists.length === 0
                ) {
                    await interaction.editReply(
                        "You have no scrobbled artists over that time period."
                    );

                    return;
                }

                const lines =
                    artists.map(
                        (
                            artist,
                            index
                        ) => {
                            const artistName =
                                artist.url
                                    ? `[${artist.name}](${artist.url})`
                                    : artist.name;

                            const plays =
                                pluralize(
                                    artist.playcount,
                                    "play"
                                );

                            return (
                                `\`${index + 1}.\` ` +
                                `${artistName} - ${plays}`
                            );
                        }
                    );

                const embed =
                    new EmbedBuilder()
                        .setColor(
                            0x000000
                        )
                        .setTitle(
                            `Your top artists ${humanizePeriod(period)}`
                        )
                        .setDescription(
                            lines.join(
                                "\n"
                            )
                        );

                await interaction.editReply({
                    embeds: [
                        embed,
                    ],
                });

                return;
            }
        } catch (error) {
            console.error(
                error
            );

            const message =
                error instanceof Error
                    ? error.message
                    : "Something went wrong.";

            if (
                interaction.deferred ||
                interaction.replied
            ) {
                await interaction.editReply(
                    `Last.fm error: ${message}`
                );
            } else {
                await interaction.reply({
                    content:
                        `Last.fm error: ${message}`,
                    flags: MessageFlags.Ephemeral,
                });
            }
        }
    }
);

await registerCommands();

await client.login(
    token
);