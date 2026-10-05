const API_ROOT =
    "https://ws.audioscrobbler.com/2.0/";

function requireApiKey(): string {
    const apiKey =
        process.env.LASTFM_API_KEY;

    if (!apiKey) {
        throw new Error(
            "LASTFM_API_KEY is missing from .env"
        );
    }

    return apiKey;
}

const RETRYABLE_STATUS_CODES =
    new Set([
        500,
        502,
        503,
        504,
    ]);

function delay(
    milliseconds: number
): Promise<void> {
    return new Promise(
        (resolve) => {
            setTimeout(
                resolve,
                milliseconds
            );
        }
    );
}

async function requestLastFm(
    params: Record<string, string>
) {
    const apiKey =
        requireApiKey();

    const url =
        new URL(API_ROOT);

    for (
        const [key, value]
        of Object.entries(params)
    ) {
        url.searchParams.set(
            key,
            value
        );
    }

    url.searchParams.set(
        "api_key",
        apiKey
    );

    url.searchParams.set(
        "format",
        "json"
    );

    const maxAttempts = 3;

    for (
        let attempt = 1;
        attempt <= maxAttempts;
        attempt += 1
    ) {
        let response:
            Response;

        try {
            response =
                await fetch(
                    url,
                    {
                        headers: {
                            "User-Agent":
                                "Melo Discord Bot/1.0",
                        },
                    }
                );
        } catch (error) {
            if (
                attempt >=
                maxAttempts
            ) {
                throw error;
            }

            const waitTime =
                attempt * 500;

            console.warn(
                `Last.fm connection failed. Retrying in ${waitTime}ms...`
            );

            await delay(
                waitTime
            );

            continue;
        }

        if (!response.ok) {
            const retryable =
                RETRYABLE_STATUS_CODES.has(
                    response.status
                );

            if (
                retryable &&
                attempt <
                    maxAttempts
            ) {
                const waitTime =
                    attempt * 500;

                console.warn(
                    `Last.fm returned ${response.status}. ` +
                    `Retrying in ${waitTime}ms...`
                );

                await delay(
                    waitTime
                );

                continue;
            }

            throw new Error(
                `Last.fm request failed with ${response.status}`
            );
        }

        const data =
            await response.json();

        if (
            typeof data ===
                "object" &&
            data !== null &&
            "error" in data
        ) {
            const errorData =
                data as {
                    error?: number;
                    message?: string;
                };

            throw new Error(
                errorData.message ??
                    "Last.fm returned an error"
            );
        }

        return data;
    }

    throw new Error(
        "Last.fm request failed after multiple attempts"
    );
}

// =================================================
// TYPES
// =================================================

export type LastFmUser = {
    name: string;
    url: string;
    playcount: string;
};

export type RecentTrack = {
    name: string;
    artist: string;
    album: string;
    url: string;
    imageUrl: string | null;
    nowPlaying: boolean;
    timestamp: number | null;
};

export type TrackInfo = {
    userPlaycount: number;
    listeners: number;
    globalPlaycount: number;
    loved: boolean;
    tags: string[];
};

export type ArtistInfo = {
    name: string;
    url: string;
    userPlaycount: number;
    listeners: number;
    tags: string[];
};
export type AlbumInfo = {
    name: string;
    artist: string;
    url: string;
    userPlaycount: number;
    listeners: number;
    globalPlaycount: number;
    tags: string[];
};
export type TopArtistPeriod =
    | "overall"
    | "7day"
    | "1month"
    | "3month"
    | "6month"
    | "12month";

export type TopArtist = {
    name: string;
    playcount: number;
    url: string;
};
export type TopTrack = {
    name: string;
    artist: string;
    playcount: number;
    url: string;
};

export type TopAlbum = {
    name: string;
    artist: string;
    playcount: number;
    url: string;
};
type RawRecentTrack = {
    name?: string;

    artist?:
    | string
    | {
        name?: string;
        "#text"?: string;
    };

    album?:
    | string
    | {
        "#text"?: string;
    };

    url?: string;

    image?: Array<{
        size?: string;
        "#text"?: string;
    }>;

    "@attr"?: {
        nowplaying?: string;
    };

    date?: {
        uts?: string;
    };
};

// =================================================
// RECENT TRACK PARSER
// =================================================

function parseRecentTrack(
    track: RawRecentTrack
): RecentTrack | null {
    if (!track.name) {
        return null;
    }

    const artist =
        typeof track.artist ===
            "string"
            ? track.artist
            : track.artist?.name ??
            track.artist?.[
            "#text"
            ] ??
            "Unknown Artist";

    const album =
        typeof track.album ===
            "string"
            ? track.album
            : track.album?.[
            "#text"
            ] ?? "";

    const image =
        track.image
            ?.filter(
                (item) =>
                    item["#text"]
            )
            .at(-1)?.["#text"];

    const nowPlaying =
        track["@attr"]
            ?.nowplaying ===
        "true";

    const timestamp =
        track.date?.uts
            ? Number(
                track.date.uts
            )
            : null;

    return {
        name:
            track.name,

        artist,

        album,

        url:
            track.url ?? "",

        imageUrl:
            image &&
                image.length > 0
                ? image
                : null,

        nowPlaying,

        timestamp,
    };
}

// =================================================
// USER
// =================================================

export async function getLastFmUser(
    username: string
): Promise<LastFmUser> {
    const data =
        (await requestLastFm({
            method:
                "user.getInfo",

            user:
                username,
        })) as {
            user?: {
                name?: string;
                url?: string;
                playcount?: string;
            };
        };

    if (!data.user?.name) {
        throw new Error(
            "Last.fm user not found"
        );
    }

    return {
        name:
            data.user.name,

        url:
            data.user.url ?? "",

        playcount:
            data.user.playcount ??
            "0",
    };
}

// =================================================
// RECENT TRACKS
// =================================================

export async function getRecentTracks(
    username: string,
    limit = 5
): Promise<RecentTrack[]> {
    const safeLimit =
        Math.min(
            Math.max(
                limit,
                1
            ),
            15
        );

    const data =
        (await requestLastFm({
            method:
                "user.getRecentTracks",

            user:
                username,

            limit:
                safeLimit.toString(),

            extended:
                "1",
        })) as {
            recenttracks?: {
                track?:
                | RawRecentTrack
                | RawRecentTrack[];
            };
        };

    const rawTracks =
        data.recenttracks?.track;

    if (!rawTracks) {
        return [];
    }

    const tracks =
        Array.isArray(
            rawTracks
        )
            ? rawTracks
            : [rawTracks];

    return tracks
        .map(
            parseRecentTrack
        )
        .filter(
            (
                track
            ): track is RecentTrack =>
                track !== null
        );
}

export async function getRecentTrack(
    username: string
): Promise<RecentTrack | null> {
    const tracks =
        await getRecentTracks(
            username,
            1
        );

    return (
        tracks[0] ??
        null
    );
}
// =================================================
// ARTIST COMBO
// =================================================

export async function getArtistComboCount(
    username: string,
    artist: string,
    maxTracks = 1000
): Promise<number> {
    const normalizedArtist =
        artist
            .trim()
            .toLowerCase();

    const pageSize = 200;

    let page = 1;
    let checked = 0;
    let plays = 0;

    while (
        checked < maxTracks
    ) {
        const remaining =
            maxTracks -
            checked;

        const limit =
            Math.min(
                pageSize,
                remaining
            );

        const data =
            (await requestLastFm({
                method:
                    "user.getRecentTracks",

                user:
                    username,

                limit:
                    limit.toString(),

                page:
                    page.toString(),

                extended:
                    "1",
            })) as {
                recenttracks?: {
                    track?:
                    | RawRecentTrack
                    | RawRecentTrack[];

                    "@attr"?: {
                        page?: string;
                        totalPages?: string;
                    };
                };
            };

        const rawTracks =
            data.recenttracks
                ?.track;

        if (!rawTracks) {
            break;
        }

        const tracks =
            (
                Array.isArray(
                    rawTracks
                )
                    ? rawTracks
                    : [rawTracks]
            )
                .map(
                    parseRecentTrack
                )
                .filter(
                    (
                        track
                    ): track is RecentTrack =>
                        track !== null
                );

        if (
            tracks.length === 0
        ) {
            break;
        }

        for (
            const track
            of tracks
        ) {
            // Gowon's combo count does not count
            // the currently-playing, unscrobbled track.
            if (
                track.nowPlaying
            ) {
                continue;
            }

            checked += 1;

            const trackArtist =
                track.artist
                    .trim()
                    .toLowerCase();

            if (
                trackArtist !==
                normalizedArtist
            ) {
                return plays;
            }

            plays += 1;

            if (
                checked >=
                maxTracks
            ) {
                return plays;
            }
        }

        const totalPages =
            Number(
                data.recenttracks
                    ?.[
                    "@attr"
                ]
                    ?.totalPages ??
                page
            );

        if (
            page >=
            totalPages
        ) {
            break;
        }

        page += 1;
    }

    return plays;
}
// =================================================
// TRACK INFO
// =================================================

export async function getTrackInfo(
    username: string,
    artist: string,
    track: string
): Promise<TrackInfo> {
    const data =
        (await requestLastFm({
            method:
                "track.getInfo",

            username,

            artist,

            track,

            autocorrect:
                "1",
        })) as {
            track?: {
                userplaycount?:
                | string
                | number;

                listeners?:
                | string
                | number;

                playcount?:
                | string
                | number;

                userloved?:
                | string
                | number;

                toptags?: {
                    tag?:
                    | {
                        name?: string;
                    }
                    | Array<{
                        name?: string;
                    }>;
                };
            };
        };

    const rawTags =
        data.track
            ?.toptags?.tag;

    const tags =
        !rawTags
            ? []
            : (
                Array.isArray(
                    rawTags
                )
                    ? rawTags
                    : [rawTags]
            )
                .map(
                    (tag) =>
                        tag.name
                            ?.trim()
                )
                .filter(
                    (
                        tag
                    ): tag is string =>
                        Boolean(tag)
                );

    return {
        userPlaycount:
            Number(
                data.track
                    ?.userplaycount ??
                0
            ),

        listeners:
            Number(
                data.track
                    ?.listeners ??
                0
            ),

        globalPlaycount:
            Number(
                data.track
                    ?.playcount ??
                0
            ),

        loved:
            String(
                data.track
                    ?.userloved ??
                "0"
            ) === "1",

        tags,
    };
}

// =================================================
// ARTIST INFO
// =================================================

export async function getArtistInfo(
    username: string,
    artist: string
): Promise<ArtistInfo> {
    const data =
        (await requestLastFm({
            method:
                "artist.getInfo",

            username,

            artist,

            autocorrect:
                "1",
        })) as {
            artist?: {
                name?: string;

                url?: string;

                stats?: {
                    listeners?:
                    | string
                    | number;

                    playcount?:
                    | string
                    | number;

                    userplaycount?:
                    | string
                    | number;
                };

                tags?: {
                    tag?:
                    | {
                        name?: string;
                    }
                    | Array<{
                        name?: string;
                    }>;
                };
            };
        };

    if (
        !data.artist?.name
    ) {
        throw new Error(
            "Artist information not found"
        );
    }

    const rawTags =
        data.artist
            .tags?.tag;

    const tags =
        !rawTags
            ? []
            : (
                Array.isArray(
                    rawTags
                )
                    ? rawTags
                    : [rawTags]
            )
                .map(
                    (tag) =>
                        tag.name
                            ?.trim()
                )
                .filter(
                    (
                        tag
                    ): tag is string =>
                        Boolean(tag)
                )
                .slice(
                    0,
                    5
                );

    return {
        name:
            data.artist.name,

        url:
            data.artist.url ??
            "",

        userPlaycount:
            Number(
                data.artist
                    .stats
                    ?.userplaycount ??
                0
            ),

        listeners:
            Number(
                data.artist
                    .stats
                    ?.listeners ??
                0
            ),

        tags,
    };
}
// =================================================
// USER ARTIST PLAYCOUNT
// =================================================

export async function getUserArtistPlaycount(
    username: string,
    artist: string
): Promise<number> {
    const data =
        (await requestLastFm({
            method:
                "artist.getInfo",

            username,

            artist,

            autocorrect:
                "1",
        })) as {
            artist?: {
                stats?: {
                    userplaycount?:
                        | string
                        | number;
                };
            };
        };

    return Number(
        data.artist
            ?.stats
            ?.userplaycount ??
            0
    );
}
// =================================================
// ALBUM INFO
// =================================================

export async function getAlbumInfo(
    username: string,
    artist: string,
    album: string
): Promise<AlbumInfo> {
    const data =
        (await requestLastFm({
            method:
                "album.getInfo",

            username,

            artist,

            album,

            autocorrect:
                "1",
        })) as {
            album?: {
                name?: string;

                artist?: string;

                url?: string;

                userplaycount?:
                | string
                | number;

                listeners?:
                | string
                | number;

                playcount?:
                | string
                | number;

                tags?: {
                    tag?:
                    | {
                        name?: string;
                    }
                    | Array<{
                        name?: string;
                    }>;
                };
            };
        };

    if (!data.album?.name) {
        throw new Error(
            "Album information not found"
        );
    }

    const rawTags =
        data.album.tags?.tag;

    const tags =
        !rawTags
            ? []
            : (
                Array.isArray(
                    rawTags
                )
                    ? rawTags
                    : [rawTags]
            )
                .map(
                    (tag) =>
                        tag.name
                            ?.trim()
                )
                .filter(
                    (
                        tag
                    ): tag is string =>
                        Boolean(tag)
                )
                .slice(
                    0,
                    5
                );

    return {
        name:
            data.album.name,

        artist:
            data.album.artist ??
            artist,

        url:
            data.album.url ?? "",

        userPlaycount:
            Number(
                data.album
                    .userplaycount ??
                0
            ),

        listeners:
            Number(
                data.album
                    .listeners ??
                0
            ),

        globalPlaycount:
            Number(
                data.album
                    .playcount ??
                0
            ),

        tags,
    };
}
// =================================================
// TOP ARTISTS
// =================================================

export async function getTopArtists(
    username: string,
    period: TopArtistPeriod =
        "7day",
    limit = 10
): Promise<TopArtist[]> {
    const safeLimit =
        Math.min(
            Math.max(
                limit,
                1
            ),
            25
        );

    const data =
        (await requestLastFm({
            method:
                "user.getTopArtists",

            user:
                username,

            period,

            limit:
                safeLimit.toString(),
        })) as {
            topartists?: {
                artist?:
                | {
                    name?: string;
                    playcount?: string;
                    url?: string;
                }
                | Array<{
                    name?: string;
                    playcount?: string;
                    url?: string;
                }>;
            };
        };

    const rawArtists =
        data.topartists
            ?.artist;

    if (!rawArtists) {
        return [];
    }

    const artists =
        Array.isArray(
            rawArtists
        )
            ? rawArtists
            : [rawArtists];

    return artists
        .filter(
            (artist) =>
                Boolean(
                    artist.name
                )
        )
        .map(
            (artist) => ({
                name:
                    artist.name ??
                    "Unknown Artist",

                playcount:
                    Number(
                        artist.playcount ??
                        0
                    ),

                url:
                    artist.url ??
                    "",
            })
        );
}
// =================================================
// TOP TRACKS
// =================================================

export async function getTopTracks(
    username: string,
    period: TopArtistPeriod =
        "7day",
    limit = 10
): Promise<TopTrack[]> {
    const safeLimit =
        Math.min(
            Math.max(
                limit,
                1
            ),
            25
        );

    const data =
        (await requestLastFm({
            method:
                "user.getTopTracks",

            user:
                username,

            period,

            limit:
                safeLimit.toString(),
        })) as {
            toptracks?: {
                track?:
                | {
                    name?: string;
                    playcount?: string;
                    url?: string;

                    artist?: {
                        name?: string;
                        url?: string;
                    };
                }
                | Array<{
                    name?: string;
                    playcount?: string;
                    url?: string;

                    artist?: {
                        name?: string;
                        url?: string;
                    };
                }>;
            };
        };

    const rawTracks =
        data.toptracks?.track;

    if (!rawTracks) {
        return [];
    }

    const tracks =
        Array.isArray(
            rawTracks
        )
            ? rawTracks
            : [rawTracks];

    return tracks
        .filter(
            (track) =>
                Boolean(
                    track.name
                )
        )
        .map(
            (track) => ({
                name:
                    track.name ??
                    "Unknown Track",

                artist:
                    track.artist?.name ??
                    "Unknown Artist",

                playcount:
                    Number(
                        track.playcount ??
                        0
                    ),

                url:
                    track.url ??
                    "",
            })
        );
}

// =================================================
// TOP ALBUMS
// =================================================

export async function getTopAlbums(
    username: string,
    period: TopArtistPeriod =
        "7day",
    limit = 10
): Promise<TopAlbum[]> {
    const safeLimit =
        Math.min(
            Math.max(
                limit,
                1
            ),
            25
        );

    const data =
        (await requestLastFm({
            method:
                "user.getTopAlbums",

            user:
                username,

            period,

            limit:
                safeLimit.toString(),
        })) as {
            topalbums?: {
                album?:
                | {
                    name?: string;
                    playcount?: string;
                    url?: string;

                    artist?: {
                        name?: string;
                        url?: string;
                    };
                }
                | Array<{
                    name?: string;
                    playcount?: string;
                    url?: string;

                    artist?: {
                        name?: string;
                        url?: string;
                    };
                }>;
            };
        };

    const rawAlbums =
        data.topalbums?.album;

    if (!rawAlbums) {
        return [];
    }

    const albums =
        Array.isArray(
            rawAlbums
        )
            ? rawAlbums
            : [rawAlbums];

    return albums
        .filter(
            (album) =>
                Boolean(
                    album.name
                )
        )
        .map(
            (album) => ({
                name:
                    album.name ??
                    "Unknown Album",

                artist:
                    album.artist?.name ??
                    "Unknown Artist",

                playcount:
                    Number(
                        album.playcount ??
                        0
                    ),

                url:
                    album.url ??
                    "",
            })
        );
}