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
// CROWNS
// =================================================

database.exec(`
    CREATE TABLE IF NOT EXISTS crowns (
        server_id TEXT NOT NULL,
        artist_name TEXT NOT NULL COLLATE NOCASE,
        holder_discord_user_id TEXT NOT NULL,
        plays INTEGER NOT NULL,
        version INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        last_stolen_at INTEGER NOT NULL,

        PRIMARY KEY (
            server_id,
            artist_name
        )
    )
`);

// =================================================
// TYPES
// =================================================

export type FmMode =
    | "default"
    | "verbose"
    | "custom"
    | "album"
    | "compact"
    | "combo";

export type LinkedLastFmUser = {
    discordUserId: string;
    lastFmUsername: string;
};

export type CrownRecord = {
    serverId: string;
    artistName: string;
    holderDiscordUserId: string;
    plays: number;
    version: number;
    createdAt: number;
    lastStolenAt: number;
};
export type CrownLeaderboardEntry = {
    discordUserId: string;
    crownCount: number;
};

export function getCrownLeaderboard(
    serverId: string
): CrownLeaderboardEntry[] {
    const rows =
        getCrownLeaderboardStatement.all(
            serverId
        ) as Array<{
            holder_discord_user_id: string;
            crown_count: number;
        }>;

    return rows.map(
        (row) => ({
            discordUserId:
                row.holder_discord_user_id,

            crownCount:
                Number(
                    row.crown_count
                ),
        })
    );
}

export function getServerCrownCount(
    serverId: string
): number {
    const row =
        getServerCrownCountStatement.get(
            serverId
        ) as
        | {
            crown_count: number;
        }
        | undefined;

    return Number(
        row?.crown_count ??
        0
    );
}
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

export const CROWN_THRESHOLD =
    30;

// =================================================
// PREPARED STATEMENTS
// =================================================

// -----------------------------
// Last.fm users
// -----------------------------

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

const getAllUsersStatement =
    database.prepare(`
        SELECT
            discord_user_id,
            lastfm_username
        FROM users
    `);

// -----------------------------
// FM configs
// -----------------------------

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

// -----------------------------
// FM modes
// -----------------------------

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

// -----------------------------
// Crowns
// -----------------------------

const getCrownStatement =
    database.prepare(`
        SELECT
            server_id,
            artist_name,
            holder_discord_user_id,
            plays,
            version,
            created_at,
            last_stolen_at
        FROM crowns
        WHERE
            server_id = ?
            AND artist_name = ?
    `);

const createCrownStatement =
    database.prepare(`
        INSERT INTO crowns (
            server_id,
            artist_name,
            holder_discord_user_id,
            plays,
            version,
            created_at,
            last_stolen_at
        )
        VALUES (?, ?, ?, ?, 0, ?, ?)
    `);

const updateCrownPlaysStatement =
    database.prepare(`
        UPDATE crowns
        SET plays = ?
        WHERE
            server_id = ?
            AND artist_name = ?
    `);

const stealCrownStatement =
    database.prepare(`
        UPDATE crowns
        SET
            holder_discord_user_id = ?,
            plays = ?,
            version = version + 1,
            last_stolen_at = ?
        WHERE
            server_id = ?
            AND artist_name = ?
    `);
const getUserCrownsStatement =
    database.prepare(`
        SELECT
            server_id,
            artist_name,
            holder_discord_user_id,
            plays,
            version,
            created_at,
            last_stolen_at
        FROM crowns
        WHERE
            server_id = ?
            AND holder_discord_user_id = ?
        ORDER BY plays DESC
    `);
const getCrownLeaderboardStatement =
    database.prepare(`
        SELECT
            holder_discord_user_id,
            COUNT(*) AS crown_count
        FROM crowns
        WHERE server_id = ?
        GROUP BY holder_discord_user_id
        ORDER BY
            crown_count DESC,
            holder_discord_user_id ASC
    `);

const getServerCrownCountStatement =
    database.prepare(`
        SELECT
            COUNT(*) AS crown_count
        FROM crowns
        WHERE server_id = ?
    `);
const getTopCrownsStatement =
    database.prepare(`
        SELECT
            server_id,
            artist_name,
            holder_discord_user_id,
            plays,
            version,
            created_at,
            last_stolen_at
        FROM crowns
        WHERE server_id = ?
        ORDER BY plays DESC
        LIMIT ?
    `);
// =================================================
// LAST.FM USER FUNCTIONS
// =================================================

export function saveLastFmUser(
    discordUserId: string,
    lastFmUsername: string
): void {
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

export function getAllLastFmUsers():
    LinkedLastFmUser[] {
    const rows =
        getAllUsersStatement.all() as Array<{
            discord_user_id: string;
            lastfm_username: string;
        }>;

    return rows.map(
        (row) => ({
            discordUserId:
                row.discord_user_id,

            lastFmUsername:
                row.lastfm_username,
        })
    );
}

// =================================================
// CUSTOM FM CONFIG FUNCTIONS
// =================================================

export function saveFmConfig(
    discordUserId: string,
    config: string[]
): void {
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
): void {
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
): void {
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
        "custom" ||
        row?.fm_mode ===
        "album" ||
        row?.fm_mode ===
        "compact" ||
        row?.fm_mode ===
        "combo"
    ) {
        return row.fm_mode;
    }

    return DEFAULT_FM_MODE;
}

// =================================================
// CROWN FUNCTIONS
// =================================================

export function getCrown(
    serverId: string,
    artistName: string
): CrownRecord | null {
    const row =
        getCrownStatement.get(
            serverId,
            artistName
        ) as
        | {
            server_id: string;
            artist_name: string;
            holder_discord_user_id: string;
            plays: number;
            version: number;
            created_at: number;
            last_stolen_at: number;
        }
        | undefined;

    if (!row) {
        return null;
    }

    return {
        serverId:
            row.server_id,

        artistName:
            row.artist_name,

        holderDiscordUserId:
            row.holder_discord_user_id,

        plays:
            row.plays,

        version:
            row.version,

        createdAt:
            row.created_at,

        lastStolenAt:
            row.last_stolen_at,
    };
}
export function getUserCrowns(
    serverId: string,
    discordUserId: string
): CrownRecord[] {
    const rows =
        getUserCrownsStatement.all(
            serverId,
            discordUserId
        ) as Array<{
            server_id: string;
            artist_name: string;
            holder_discord_user_id: string;
            plays: number;
            version: number;
            created_at: number;
            last_stolen_at: number;
        }>;

    return rows.map(
        (row) => ({
            serverId:
                row.server_id,

            artistName:
                row.artist_name,

            holderDiscordUserId:
                row.holder_discord_user_id,

            plays:
                row.plays,

            version:
                row.version,

            createdAt:
                row.created_at,

            lastStolenAt:
                row.last_stolen_at,
        })
    );
}
export function createCrown(
    serverId: string,
    artistName: string,
    holderDiscordUserId: string,
    plays: number
): CrownRecord {
    const now =
        Date.now();

    createCrownStatement.run(
        serverId,
        artistName,
        holderDiscordUserId,
        plays,
        now,
        now
    );

    return {
        serverId,
        artistName,
        holderDiscordUserId,
        plays,
        version: 0,
        createdAt: now,
        lastStolenAt: now,
    };
}

export function updateCrownPlays(
    serverId: string,
    artistName: string,
    plays: number
): void {
    updateCrownPlaysStatement.run(
        plays,
        serverId,
        artistName
    );
}

export function stealCrown(
    serverId: string,
    artistName: string,
    newHolderDiscordUserId: string,
    plays: number
): void {
    stealCrownStatement.run(
        newHolderDiscordUserId,
        plays,
        Date.now(),
        serverId,
        artistName
    );
}
export function getTopCrowns(
    serverId: string,
    limit = 10
): CrownRecord[] {
    const safeLimit =
        Math.min(
            Math.max(
                limit,
                1
            ),
            25
        );

    const rows =
        getTopCrownsStatement.all(
            serverId,
            safeLimit
        ) as Array<{
            server_id: string;
            artist_name: string;
            holder_discord_user_id: string;
            plays: number;
            version: number;
            created_at: number;
            last_stolen_at: number;
        }>;

    return rows.map(
        (row) => ({
            serverId:
                row.server_id,

            artistName:
                row.artist_name,

            holderDiscordUserId:
                row.holder_discord_user_id,

            plays:
                row.plays,

            version:
                row.version,

            createdAt:
                row.created_at,

            lastStolenAt:
                row.last_stolen_at,
        })
    );
}