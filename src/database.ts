import { mkdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

mkdirSync("data", {
    recursive: true,
});

const database = new DatabaseSync(
    "data/melo.db"
);

database.exec(`
    CREATE TABLE IF NOT EXISTS users (
        discord_user_id TEXT PRIMARY KEY,
        lastfm_username TEXT NOT NULL,
        linked_at INTEGER NOT NULL
    )
`);

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
    const row = getUserStatement.get(
        discordUserId
    ) as
        | {
              lastfm_username: string;
          }
        | undefined;

    return row?.lastfm_username ?? null;
}