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
    getAllLastFmUsers,
    getFmConfig,
    getFmMode,
    getLastFmUser as getSavedLastFmUser,
    resetFmConfig,
    saveFmConfig,
    saveFmMode,
    saveLastFmUser,
    type FmMode,
} from "./database.js";

import {
    ALBUM_FM_CONFIG,
    COMBO_FM_CONFIG,
    COMPACT_FM_CONFIG,
    FM_COMPONENTS,
    FM_COMPONENT_LABELS,
    FM_PRESETS,
    getFmPreset,
    normalizeFmConfig,
    renderFmFooter,
} from "./fmConfig.js";

import {
    getAlbumInfo,
    getArtistComboCount,
    getArtistInfo,
    getLastFmUser as fetchLastFmUser,
    getRecentTrack,
    getRecentTracks,
    getTopAlbums,
    getTopArtists,
    getTopTracks,
    getTrackInfo,
    getUserArtistPlaycount,
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
        .setName("wk")
        .setDescription(
            "Show who has scrobbled an artist in this server."
        )
        .addStringOption((option) =>
            option
                .setName("artist")
                .setDescription(
                    "Artist name; leave blank to use your current artist"
                )
                .setRequired(false)
        )
        .toJSON(),

    new SlashCommandBuilder()
        .setName("fmwk")
        .setDescription(
            "Show who has scrobbled an artist in this server."
        )
        .addStringOption((option) =>
            option
                .setName("artist")
                .setDescription(
                    "Artist name; leave blank to use your current artist"
                )
                .setRequired(false)
        )
        .toJSON(),

    new SlashCommandBuilder()
        .setName("whoknows")
        .setDescription(
            "Show who has scrobbled an artist in this server."
        )
        .addStringOption((option) =>
            option
                .setName("artist")
                .setDescription(
                    "Artist name; leave blank to use your current artist"
                )
                .setRequired(false)
        )
        .toJSON(),

    new SlashCommandBuilder()
        .setName("fma")
        .setDescription(
            "Display your now playing track with album information."
        )
        .toJSON(),

    new SlashCommandBuilder()
        .setName("fml")
        .setDescription(
            "Display your now playing track with album information."
        )
        .toJSON(),

    new SlashCommandBuilder()
        .setName("npl")
        .setDescription(
            "Display your now playing track with album information."
        )
        .toJSON(),

    new SlashCommandBuilder()
        .setName("fmc")
        .setDescription(
            "Display a compact now playing or last played track."
        )
        .toJSON(),

    new SlashCommandBuilder()
        .setName("fmcombo")
        .setDescription(
            "Display your now playing track with the current artist combo."
        )
        .toJSON(),

    new SlashCommandBuilder()
        .setName("npcombo")
        .setDescription(
            "Display your now playing track with the current artist combo."
        )
        .toJSON(),

    new SlashCommandBuilder()
        .setName("fmmode")
        .setDescription(
            "Choose which now-playing mode /fm and /np use."
        )
        .addStringOption(
            (option) =>
                option
                    .setName("mode")
                    .setDescription(
                        "The FM mode to use"
                    )
                    .addChoices(
                        {
                            name: "Default",
                            value: "default",
                        },
                        {
                            name: "Verbose",
                            value: "verbose",
                        },
                        {
                            name: "Custom",
                            value: "custom",
                        },
                        {
                            name: "Album",
                            value: "album",
                        },
                        {
                            name: "Compact",
                            value: "compact",
                        },
                        {
                            name: "Combo",
                            value: "combo",
                        }
                    )
                    .setRequired(false)
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
                    .setName("help")
                    .setDescription(
                        "View help for customizing your now-playing footer."
                    )
        )

        .addSubcommand(
            (subcommand) =>
                subcommand
                    .setName("preview")
                    .setDescription(
                        "Preview an FM configuration without saving it."
                    )
                    .addStringOption(
                        (option) =>
                            option
                                .setName(
                                    "options"
                                )
                                .setDescription(
                                    "Example: loved artist-plays listeners artist-tags"
                                )
                                .setRequired(
                                    true
                                )
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
            "Show your recent Last.fm tracks."
        )
        .addIntegerOption((option) =>
            option
                .setName("count")
                .setDescription(
                    "The number of recent tracks to show"
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

    new SlashCommandBuilder()
        .setName("toptracks")
        .setDescription(
            "Show your top tracks over a given time period."
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

    new SlashCommandBuilder()
        .setName("topalbums")
        .setDescription(
            "Show your top albums over a given time period."
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
            GatewayIntentBits.GuildMembers,
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
    "error",
    (error) => {
        console.error(
            "Discord client error:",
            error
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
            // /fmmode
            // =================================================

            if (
                interaction.commandName ===
                "fmmode"
            ) {
                const selectedMode =
                    interaction.options
                        .getString(
                            "mode"
                        ) as
                    | FmMode
                    | null;

                // No mode supplied:
                // just show the current setting.
                if (!selectedMode) {
                    const currentMode =
                        getFmMode(
                            interaction.user.id
                        );

                    const embed =
                        new EmbedBuilder()
                            .setColor(
                                0x000000
                            )
                            .setTitle(
                                "Your FM mode"
                            )
                            .setDescription(
                                `Your current \`/fm\` mode is: \`${currentMode}\``
                            )
                            .setFooter({
                                text:
                                    "Use /fmmode mode: to change it.",
                            });

                    await interaction.reply({
                        embeds: [
                            embed,
                        ],
                        flags:
                            MessageFlags.Ephemeral,
                    });

                    return;
                }

                saveFmMode(
                    interaction.user.id,
                    selectedMode
                );

                await interaction.reply({
                    content:
                        `Your new \`/fm\` mode is: \`${selectedMode}\``,
                    flags:
                        MessageFlags.Ephemeral,
                });

                return;
            }
            // =================================================
            // /fm + /np + /fmc
            // =================================================

            if (
                interaction.commandName ===
                "fm" ||
                interaction.commandName ===
                "np" ||
                interaction.commandName ===
                "fmc"
            ) {
                const userId =
                    interaction.user.id;

                const username =
                    getSavedLastFmUser(
                        userId
                    );

                if (!username) {
                    await interaction.reply({
                        content:
                            "You haven't linked a Last.fm account yet. Use `/setuser username:` first.",
                        flags:
                            MessageFlags.Ephemeral,
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

                const fmMode =
                    getFmMode(
                        userId
                    );

                let fmConfig:
                    string[];

                if (
                    interaction.commandName ===
                    "fmc"
                ) {
                    fmConfig =
                        COMPACT_FM_CONFIG;
                } else if (
                    fmMode ===
                    "custom"
                ) {
                    fmConfig =
                        getFmConfig(
                            userId
                        );
                } else if (
                    fmMode ===
                    "album"
                ) {
                    fmConfig =
                        ALBUM_FM_CONFIG;
                } else if (
                    fmMode ===
                    "compact"
                ) {
                    fmConfig =
                        COMPACT_FM_CONFIG;
                } else if (
                    fmMode ===
                    "combo"
                ) {
                    fmConfig =
                        COMBO_FM_CONFIG;
                } else {
                    fmConfig =
                        getFmPreset(
                            fmMode
                        ) ?? [];
                }

                const needsAlbumInfo =
                    fmConfig.includes(
                        "album-plays"
                    ) &&
                    Boolean(
                        track.album
                    );

                const needsCombo =
                    interaction.commandName !==
                    "fmc" &&
                    fmMode ===
                    "combo";

                const [
                    lastFmUser,
                    artistInfo,
                    trackInfo,
                    albumInfo,
                    comboCount,
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

                        needsAlbumInfo
                            ? getAlbumInfo(
                                username,
                                track.artist,
                                track.album
                            ).catch(
                                (error) => {
                                    console.error(
                                        "Could not load album info:",
                                        error
                                    );

                                    return null;
                                }
                            )
                            : Promise.resolve(
                                null
                            ),

                        needsCombo
                            ? getArtistComboCount(
                                username,
                                track.artist
                            ).catch(
                                (error) => {
                                    console.error(
                                        "Could not calculate artist combo:",
                                        error
                                    );

                                    return 0;
                                }
                            )
                            : Promise.resolve(
                                null
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

                const footerText =
                    renderFmFooter(
                        fmConfig,
                        {
                            artistName,

                            albumName:
                                track.album,

                            trackName:
                                track.name,

                            artistInfo,

                            albumInfo,

                            trackInfo,

                            totalScrobbles:
                                Number(
                                    lastFmUser.playcount
                                ),

                            comboCount,
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
            // /fmx + /npx
            // =================================================

            if (
                interaction.commandName ===
                "fmx" ||
                interaction.commandName ===
                "npx"
            ) {
                const userId =
                    interaction.user.id;

                const username =
                    getSavedLastFmUser(
                        userId
                    );

                if (!username) {
                    await interaction.reply({
                        content:
                            "You haven't linked a Last.fm account yet. Use `/setuser username:` first.",
                        flags:
                            MessageFlags.Ephemeral,
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

                const fmConfig =
                    getFmConfig(
                        userId
                    );

                const needsAlbumInfo =
                    fmConfig.includes(
                        "album-plays"
                    ) &&
                    Boolean(
                        track.album
                    );

                const [
                    lastFmUser,
                    artistInfo,
                    trackInfo,
                    albumInfo,
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

                        needsAlbumInfo
                            ? getAlbumInfo(
                                username,
                                track.artist,
                                track.album
                            ).catch(
                                (error) => {
                                    console.error(
                                        "Could not load album info:",
                                        error
                                    );

                                    return null;
                                }
                            )
                            : Promise.resolve(
                                null
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

                const footerText =
                    renderFmFooter(
                        fmConfig,
                        {
                            artistName,

                            albumName:
                                track.album,

                            trackName:
                                track.name,

                            artistInfo,

                            albumInfo,

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
            // /fma + /fml + /npl
            // =================================================

            if (
                interaction.commandName ===
                "fma" ||
                interaction.commandName ===
                "fml" ||
                interaction.commandName ===
                "npl"
            ) {
                const username =
                    getSavedLastFmUser(
                        interaction.user.id
                    );

                if (!username) {
                    await interaction.reply({
                        content:
                            "You haven't linked a Last.fm account yet. Use `/setuser username:` first.",
                        flags:
                            MessageFlags.Ephemeral,
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
                    albumInfo,
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

                        track.album
                            ? getAlbumInfo(
                                username,
                                track.artist,
                                track.album
                            ).catch(
                                (error) => {
                                    console.error(
                                        "Could not load album info:",
                                        error
                                    );

                                    return null;
                                }
                            )
                            : Promise.resolve(
                                null
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

                const footerText =
                    renderFmFooter(
                        ALBUM_FM_CONFIG,
                        {
                            artistName,

                            albumName:
                                track.album,

                            trackName:
                                track.name,

                            artistInfo,

                            albumInfo,

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
            // /fmcombo + /npcombo
            // =================================================

            if (
                interaction.commandName ===
                "fmcombo" ||
                interaction.commandName ===
                "npcombo"
            ) {
                const username =
                    getSavedLastFmUser(
                        interaction.user.id
                    );

                if (!username) {
                    await interaction.reply({
                        content:
                            "You haven't linked a Last.fm account yet. Use `/setuser username:` first.",
                        flags:
                            MessageFlags.Ephemeral,
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
                    comboCount,
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

                        getArtistComboCount(
                            username,
                            track.artist
                        ).catch(
                            (error) => {
                                console.error(
                                    "Could not calculate artist combo:",
                                    error
                                );

                                return 0;
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

                const footerText =
                    renderFmFooter(
                        COMBO_FM_CONFIG,
                        {
                            artistName,

                            albumName:
                                track.album,

                            trackName:
                                track.name,

                            artistInfo,

                            albumInfo:
                                null,

                            trackInfo:
                                null,

                            totalScrobbles:
                                Number(
                                    lastFmUser.playcount
                                ),

                            comboCount,
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
                        flags:
                            MessageFlags.Ephemeral,
                    });

                    return;
                }

                // ---------------------------------------------
                // /npc help
                // ---------------------------------------------

                if (
                    subcommand ===
                    "help"
                ) {
                    const options =
                        FM_COMPONENTS
                            .map(
                                (component) =>
                                    `\`${component}\` — ${FM_COMPONENT_LABELS[component]}`
                            )
                            .join(
                                "\n"
                            );
                    const presets =
                        Object.keys(
                            FM_PRESETS
                        )
                            .map(
                                (preset) =>
                                    `\`${preset}\``
                            )
                            .join(", ");
                    const embed =
                        new EmbedBuilder()
                            .setColor(
                                0x000000
                            )
                            .setTitle(
                                "Help with now-playing config"
                            )
                            .setDescription(
                                "Now-playing config lets you choose which elements appear in your `/fmx` and `/npx` footer.\n\n" +

                                "**Commands**\n" +
                                "`/npc view` — View your current configuration\n" +
                                "`/npc preview` — Preview options without saving them\n" +
                                "`/npc set` — Replace your entire configuration\n" +
                                "`/npc add` — Add options to your current configuration\n" +
                                "`/npc remove` — Remove options from your current configuration\n" +
                                "`/npc reset` — Reset to Melo's default configuration\n\n" +

                                "**Available options**\n" +
                                options +
                                "\n\n" +

                                "**Presets**\n" +
                                presets +
                                "\n\n" +
                                "Presets can be used with `/npc set` and `/npc preview`."
                            )
                            .setFooter({
                                text:
                                    "Use /npc set to replace your config, or /npc add and /npc remove to edit it.",
                            });

                    await interaction.reply({
                        embeds: [
                            embed,
                        ],
                        flags:
                            MessageFlags.Ephemeral,
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
                        flags:
                            MessageFlags.Ephemeral,
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

                const presetConfig =
                    (
                        parsed.length === 1 &&
                        (
                            subcommand ===
                            "set" ||
                            subcommand ===
                            "preview"
                        )
                    )
                        ? getFmPreset(
                            parsed[0]
                        )
                        : null;

                const usingPreset =
                    presetConfig !== null;

                const valid =
                    usingPreset
                        ? presetConfig
                        : normalizeFmConfig(
                            parsed
                        );

                const invalid =
                    usingPreset
                        ? []
                        : parsed.filter(
                            (option) =>
                                !(
                                    FM_COMPONENTS as readonly string[]
                                ).includes(
                                    option
                                )
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
                        flags:
                            MessageFlags.Ephemeral,
                    });

                    return;
                }
                // ---------------------------------------------
                // /npc preview
                // ---------------------------------------------

                if (
                    subcommand ===
                    "preview"
                ) {
                    const username =
                        getSavedLastFmUser(
                            userId
                        );

                    if (!username) {
                        await interaction.reply({
                            content:
                                "You haven't linked a Last.fm account yet. Use `/setuser username:` first.",
                            flags:
                                MessageFlags.Ephemeral,
                        });

                        return;
                    }

                    await interaction.deferReply({
                        flags:
                            MessageFlags.Ephemeral,
                    });

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

                    const needsAlbumInfo =
                        valid.includes(
                            "album-plays"
                        ) &&
                        Boolean(
                            track.album
                        );

                    const [
                        lastFmUser,
                        artistInfo,
                        trackInfo,
                        albumInfo,
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

                            needsAlbumInfo
                                ? getAlbumInfo(
                                    username,
                                    track.artist,
                                    track.album
                                ).catch(
                                    (error) => {
                                        console.error(
                                            "Could not load album info:",
                                            error
                                        );

                                        return null;
                                    }
                                )
                                : Promise.resolve(
                                    null
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

                    const footerText =
                        renderFmFooter(
                            valid,
                            {
                                artistName,

                                albumName:
                                    track.album,

                                trackName:
                                    track.name,

                                artistInfo,

                                albumInfo,

                                trackInfo,

                                totalScrobbles:
                                    Number(
                                        lastFmUser.playcount
                                    ),
                            }
                        );

                    const previewLabel =
                        usingPreset
                            ? `${parsed[0]} preset`
                            : valid.length === 1
                                ? valid[0]
                                : `${valid.length} options`;

                    const embed =
                        new EmbedBuilder()
                            .setColor(
                                0x000000
                            )
                            .setAuthor({
                                name:
                                    `Previewing ${previewLabel}`,
                            })
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
                        flags:
                            MessageFlags.Ephemeral,
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
                        flags:
                            MessageFlags.Ephemeral,
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
                        new Set<string>(
                            valid
                        );

                    const updated =
                        current.filter(
                            (component) =>
                                !removeSet.has(
                                    component
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
                        flags:
                            MessageFlags.Ephemeral,
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

            // =================================================
            // /toptracks
            // =================================================

            if (
                interaction.commandName ===
                "toptracks"
            ) {
                const username =
                    getSavedLastFmUser(
                        interaction.user.id
                    );

                if (!username) {
                    await interaction.reply({
                        content:
                            "You haven't linked a Last.fm account yet. Use `/setuser username:` first.",
                        flags:
                            MessageFlags.Ephemeral,
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

                const tracks =
                    await getTopTracks(
                        username,
                        period,
                        count
                    );

                if (
                    tracks.length === 0
                ) {
                    await interaction.editReply(
                        "You have no scrobbled tracks over that time period."
                    );

                    return;
                }

                const lines =
                    tracks.map(
                        (
                            track,
                            index
                        ) => {
                            const trackName =
                                track.url
                                    ? `[${track.name}](${track.url})`
                                    : track.name;

                            const plays =
                                pluralize(
                                    track.playcount,
                                    "play"
                                );

                            return (
                                `\`${index + 1}.\` ` +
                                `${trackName} by ${track.artist} - ${plays}`
                            );
                        }
                    );

                const embed =
                    new EmbedBuilder()
                        .setColor(
                            0x000000
                        )
                        .setTitle(
                            `Your top tracks ${humanizePeriod(period)}`
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

            // =================================================
            // /topalbums
            // =================================================

            if (
                interaction.commandName ===
                "topalbums"
            ) {
                const username =
                    getSavedLastFmUser(
                        interaction.user.id
                    );

                if (!username) {
                    await interaction.reply({
                        content:
                            "You haven't linked a Last.fm account yet. Use `/setuser username:` first.",
                        flags:
                            MessageFlags.Ephemeral,
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

                const albums =
                    await getTopAlbums(
                        username,
                        period,
                        count
                    );

                if (
                    albums.length === 0
                ) {
                    await interaction.editReply(
                        "You have no scrobbled albums over that time period."
                    );

                    return;
                }

                const lines =
                    albums.map(
                        (
                            album,
                            index
                        ) => {
                            const albumName =
                                album.url
                                    ? `[${album.name}](${album.url})`
                                    : album.name;

                            const plays =
                                pluralize(
                                    album.playcount,
                                    "play"
                                );

                            return (
                                `\`${index + 1}.\` ` +
                                `${albumName} by ${album.artist} - ${plays}`
                            );
                        }
                    );

                const embed =
                    new EmbedBuilder()
                        .setColor(
                            0x000000
                        )
                        .setTitle(
                            `Your top albums ${humanizePeriod(period)}`
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
        // =================================================
        // /wk + /fmwk + /whoknows
        // =================================================

        if (
            interaction.commandName ===
            "wk" ||
            interaction.commandName ===
            "fmwk" ||
            interaction.commandName ===
            "whoknows"
        ) {
            if (!interaction.guild) {
                await interaction.reply({
                    content:
                        "Who Knows can only be used inside a Discord server.",
                    flags:
                        MessageFlags.Ephemeral,
                });

                return;
            }

            await interaction.deferReply();

            let artist =
                interaction.options
                    .getString(
                        "artist"
                    )
                    ?.trim() ??
                "";

            // If no artist was supplied,
            // use the requesting user's current/recent artist.
            if (!artist) {
                const username =
                    getSavedLastFmUser(
                        interaction.user.id
                    );

                if (!username) {
                    await interaction.editReply(
                        "You haven't linked a Last.fm account yet. " +
                        "Use `/setuser username:` first, or provide an `artist:`."
                    );

                    return;
                }

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

                artist =
                    track.artist;
            }

            // Only check people who have actually linked
            // a Last.fm account to Melo.
            //
            // We deliberately do NOT fetch the entire guild here.
            // Fetching every member uses Discord Gateway opcode 8
            // and can be rate-limited when /wk is used repeatedly.

            const linkedUsers =
                getAllLastFmUsers();

            const serverUsers:
                typeof linkedUsers = [];

            const memberDisplayNames =
                new Map<
                    string,
                    string
                >();

            for (
                const linkedUser
                of linkedUsers
            ) {
                let member =
                    interaction.guild
                        .members
                        .cache
                        .get(
                            linkedUser
                                .discordUserId
                        );

                if (!member) {
                    try {
                        member =
                            await interaction.guild
                                .members
                                .fetch(
                                    linkedUser
                                        .discordUserId
                                );
                    } catch {
                        // The linked user is not currently
                        // in this Discord server.
                        continue;
                    }
                }

                serverUsers.push(
                    linkedUser
                );

                memberDisplayNames.set(
                    linkedUser.discordUserId,
                    member.displayName
                );
            }

            if (
                serverUsers.length === 0
            ) {
                await interaction.editReply(
                    "No one in this server has linked a Last.fm account to Melo yet."
                );

                return;
            }

            const results:
                Array<{
                    discordUserId: string;
                    lastFmUsername: string;
                    playcount: number;
                }> = [];

            // Keep concurrency modest so Who Knows
            // doesn't hammer Last.fm all at once.
            const batchSize = 5;

            for (
                let index = 0;
                index < serverUsers.length;
                index += batchSize
            ) {
                const batch =
                    serverUsers.slice(
                        index,
                        index +
                        batchSize
                    );

                const batchResults =
                    await Promise.all(
                        batch.map(
                            async (
                                linkedUser
                            ) => {
                                try {
                                    const playcount =
                                        await getUserArtistPlaycount(
                                            linkedUser.lastFmUsername,
                                            artist
                                        );

                                    return {
                                        discordUserId:
                                            linkedUser.discordUserId,

                                        lastFmUsername:
                                            linkedUser.lastFmUsername,

                                        playcount,
                                    };
                                } catch (
                                error
                                ) {
                                    console.error(
                                        `Could not load artist plays for ${linkedUser.lastFmUsername}:`,
                                        error
                                    );

                                    return null;
                                }
                            }
                        )
                    );

                for (
                    const result
                    of batchResults
                ) {
                    if (
                        result &&
                        result.playcount > 0
                    ) {
                        results.push(
                            result
                        );
                    }
                }
            }

            results.sort(
                (
                    first,
                    second
                ) =>
                    second.playcount -
                    first.playcount
            );

            if (
                results.length === 0
            ) {
                const embed =
                    new EmbedBuilder()
                        .setColor(
                            0x000000
                        )
                        .setTitle(
                            `Who knows ${artist} in ${interaction.guild.name}?`
                        )
                        .setDescription(
                            "No one knows this artist."
                        );

                await interaction.editReply({
                    embeds: [
                        embed,
                    ],
                });

                return;
            }

            const topResults =
                results.slice(
                    0,
                    15
                );

            const lines =
                topResults.map(
                    (
                        result,
                        index
                    ) => {
                        const displayName =
                            memberDisplayNames.get(
                                result.discordUserId
                            ) ??
                            result.lastFmUsername;

                        const plays =
                            pluralize(
                                result.playcount,
                                "play"
                            );

                        return (
                            `\`${index + 1}.\` ` +
                            `**${displayName}** - ${plays}`
                        );
                    }
                );

            const embed =
                new EmbedBuilder()
                    .setColor(
                        0x000000
                    )
                    .setTitle(
                        `Who knows ${artist} in ${interaction.guild.name}?`
                    )
                    .setDescription(
                        lines.join(
                            "\n"
                        )
                    )
                    .setFooter({
                        text:
                            pluralize(
                                results.length,
                                "server listener"
                            ),
                    });

            await interaction.editReply({
                embeds: [
                    embed,
                ],
            });

            return;
        }
    }

);

await registerCommands();

await client.login(
    token


);
