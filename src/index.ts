import "dotenv/config";

import {
    Client,
    EmbedBuilder,
    Events,
    GatewayIntentBits,
    REST,
    Routes,
    SlashCommandBuilder,
} from "discord.js";

import {
    getLastFmUser as getSavedLastFmUser,
    saveLastFmUser,
} from "./database.js";

import {
    getLastFmUser as fetchLastFmUser,
    getRecentTrack,
    getTrackInfo,
} from "./lastfm.js";

function requireEnv(name: string): string {
    const value = process.env[name];

    if (!value) {
        throw new Error(
            `${name} is missing from .env`
        );
    }

    return value;
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
            "Show your currently playing or most recent Last.fm track."
        )
        .toJSON(),
];

const rest = new REST({
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

const client = new Client({
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
                    ephemeral: true,
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
                    `Linked your Discord account to **${lastFmUser.name}** on Last.fm.\nTotal scrobbles: **${playcount}**`
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
                        ephemeral: true,
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
                        .setColor(0xd92323)
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
                    embeds: [embed],
                });

                return;
            }

            // =================================================
            // /fm
            // =================================================

            if (
                interaction.commandName ===
                "fm"
            ) {
                const username =
                    getSavedLastFmUser(
                        interaction.user.id
                    );

                if (!username) {
                    await interaction.reply({
                        content:
                            "You haven't linked a Last.fm account yet. Use `/setuser username:` first.",
                        ephemeral: true,
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

                let userPlaycount = 0;
                let listeners = 0;
                let globalPlaycount = 0;

                try {
                    const trackInfo =
                        await getTrackInfo(
                            username,
                            track.artist,
                            track.name
                        );

                    userPlaycount =
                        trackInfo.userPlaycount;

                    listeners =
                        trackInfo.listeners;

                    globalPlaycount =
                        trackInfo.globalPlaycount;
                } catch (error) {
                    console.error(
                        "Could not load track info:",
                        error
                    );
                }

                const statusText =
                    track.nowPlaying
                        ? "🎵 Now playing"
                        : "Recently played";

                const embed =
                    new EmbedBuilder()
                        .setColor(0xd92323)
                        .setAuthor({
                            name:
                                `${interaction.user.displayName} · ${statusText}`,
                        })
                        .setTitle(
                            track.name
                        )
                        .setDescription(
                            `**${track.artist}**`
                        )
                        .addFields(
                            {
                                name: "Album",
                                value:
                                    track.album ||
                                    "Unknown album",
                                inline: true,
                            },
                            {
                                name: "Your plays",
                                value:
                                    userPlaycount.toLocaleString(),
                                inline: true,
                            },
                            {
                                name: "Listeners",
                                value:
                                    listeners.toLocaleString(),
                                inline: true,
                            },
                            {
                                name:
                                    "Global scrobbles",
                                value:
                                    globalPlaycount.toLocaleString(),
                                inline: true,
                            }
                        )
                        .setFooter({
                            text:
                                `${username} on Last.fm`,
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

                if (
                    !track.nowPlaying &&
                    track.timestamp
                ) {
                    embed.addFields({
                        name: "Played",
                        value:
                            `<t:${track.timestamp}:R>`,
                        inline: true,
                    });
                }

                await interaction.editReply({
                    embeds: [embed],
                });

                return;
            }
        } catch (error) {
            console.error(error);

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
                    ephemeral: true,
                });
            }
        }
    }
);

await registerCommands();

await client.login(token);