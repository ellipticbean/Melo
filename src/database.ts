import { mkdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

mkdirSync("data", {
    recursive: true,
});

const database =
    new DatabaseSync(
        "data/melo.db"
    );

// =================================================
// LAST.FM USERS
// =================================================

database.exec(`
    CREATE TABLE IF NOT EXISTS users (
        discord_user_id TEXT PRIMARY KEY,
        lastfm_username TEXT NOT NULL,
        linked_at INTEGER NOT NULL
    )
`);

// =================================================
// CUSTOM FM CONFIGS
// =================================================

database.exec(`
    CREATE TABLE IF NOT EXISTS fm_configs (
        discord_user_id TEXT PRIMARY KEY,
        config_json TEXT NOT NULL,
        updated_at INTEGER NOT NULL
    )
`);

// =================================================
// FM MODE SETTINGS
// =================================================

database.exec(`
    CREATE TABLE IF NOT EXISTS fm_settings (
        discord_user_id TEXT PRIMARY KEY,
        fm_mode TEXT NOT NULL,
        updated_at INTEGER NOT NULL
    )
`);

// =================================================
// TYPES
// =================================================

export type FmMode =
    | "default"
    | "verbose"
    | "custom";

// =================================================
// DEFAULTS
// =================================================

export const DEFAULT_FM_CONFIG = [
    "loved",
    "artist-plays",
    "track-plays",
    "artist-tags",
];

export const DEFAULT_FM_MODE:
    FmMode =
    "default";

// =================================================
// PREPARED STATEMENTS
// =================================================

const saveUserStatement =
    database.prepare(`
        INSERT INTO users (
            discord_user_id,
            lastfm_username,
            linked_at
        )
        VALUES (?, ?, ?)

        ON CONFLICT(discord_user_id)
        DO UPDATE SET
            lastfm_username = excluded.lastfm_username,
            linked_at = excluded.linked_at
    `);

const getUserStatement =
    database.prepare(`
        SELECT lastfm_username
        FROM users
        WHERE discord_user_id = ?
    `);

const saveFmConfigStatement =
    database.prepare(`
        INSERT INTO fm_configs (
            discord_user_id,
            config_json,
            updated_at
        )
        VALUES (?, ?, ?)

        ON CONFLICT(discord_user_id)
        DO UPDATE SET
            config_json = excluded.config_json,
            updated_at = excluded.updated_at
    `);

const getFmConfigStatement =
    database.prepare(`
        SELECT config_json
        FROM fm_configs
        WHERE discord_user_id = ?
    `);

const deleteFmConfigStatement =
    database.prepare(`
        DELETE FROM fm_configs
        WHERE discord_user_id = ?
    `);

const saveFmModeStatement =
    database.prepare(`
        INSERT INTO fm_settings (
            discord_user_id,
            fm_mode,
            updated_at
        )
        VALUES (?, ?, ?)

        ON CONFLICT(discord_user_id)
        DO UPDATE SET
            fm_mode = excluded.fm_mode,
            updated_at = excluded.updated_at
    `);

const getFmModeStatement =
    database.prepare(`
        SELECT fm_mode
        FROM fm_settings
        WHERE discord_user_id = ?
    `);

// =================================================
// LAST.FM USER FUNCTIONS
// =================================================

export function saveLastFmUser(
    discordUserId: string,
    lastFmUsername: string
) {
    saveUserStatement.run(
        discordUserId,
        lastFmUsername,
        Date.now()
    );
}

export function getLastFmUser(
    discordUserId: string
): string | null {
    const row =
        getUserStatement.get(
            discordUserId
        ) as
            | {
                  lastfm_username: string;
              }
            | undefined;

    return (
        row?.lastfm_username ??
        null
    );
}

// =================================================
// CUSTOM FM CONFIG FUNCTIONS
// =================================================

export function saveFmConfig(
    discordUserId: string,
    config: string[]
) {
    saveFmConfigStatement.run(
        discordUserId,
        JSON.stringify(
            config
        ),
        Date.now()
    );
}

export function getFmConfig(
    discordUserId: string
): string[] {
    const row =
        getFmConfigStatement.get(
            discordUserId
        ) as
            | {
                  config_json: string;
              }
            | undefined;

    if (!row) {
        return [
            ...DEFAULT_FM_CONFIG,
        ];
    }

    try {
        const parsed =
            JSON.parse(
                row.config_json
            );

        if (
            !Array.isArray(
                parsed
            )
        ) {
            return [
                ...DEFAULT_FM_CONFIG,
            ];
        }

        return parsed.filter(
            (
                item
            ): item is string =>
                typeof item ===
                "string"
        );
    } catch {
        return [
            ...DEFAULT_FM_CONFIG,
        ];
    }
}

export function resetFmConfig(
    discordUserId: string
) {
    deleteFmConfigStatement.run(
        discordUserId
    );
}

// =================================================
// FM MODE FUNCTIONS
// =================================================

export function saveFmMode(
    discordUserId: string,
    mode: FmMode
) {
    saveFmModeStatement.run(
        discordUserId,
        mode,
        Date.now()
    );
}

export function getFmMode(
    discordUserId: string
): FmMode {
    const row =
        getFmModeStatement.get(
            discordUserId
        ) as
            | {
                  fm_mode: string;
              }
            | undefined;

    if (
        row?.fm_mode ===
            "default" ||
        row?.fm_mode ===
            "verbose" ||
        row?.fm_mode ===
            "custom"
    ) {
        return row.fm_mode;
    }

    return DEFAULT_FM_MODE;
}