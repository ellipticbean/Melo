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

async function requestLastFm(
    params: Record<string, string>
) {
    const apiKey = requireApiKey();

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

    const response = await fetch(url, {
        headers: {
            "User-Agent":
                "Melo Discord Bot/1.0",
        },
    });

    if (!response.ok) {
        throw new Error(
            `Last.fm request failed with ${response.status}`
        );
    }

    const data =
        await response.json();

    if (
        typeof data === "object" &&
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
};

export type ArtistInfo = {
    name: string;
    url: string;
    userPlaycount: number;
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

function parseRecentTrack(
    track: RawRecentTrack
): RecentTrack | null {
    if (!track.name) {
        return null;
    }

    const artist =
        typeof track.artist === "string"
            ? track.artist
            : track.artist?.name ??
            track.artist?.["#text"] ??
            "Unknown Artist";

    const album =
        typeof track.album === "string"
            ? track.album
            : track.album?.["#text"] ??
            "";

    const image =
        track.image
            ?.filter(
                (item) =>
                    item["#text"]
            )
            .at(-1)?.["#text"];

    const nowPlaying =
        track["@attr"]?.nowplaying ===
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

export async function getLastFmUser(
    username: string
): Promise<LastFmUser> {
    const data =
        (await requestLastFm({
            method: "user.getInfo",
            user: username,
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
            data.user.playcount ?? "0",
    };
}

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
        Array.isArray(rawTracks)
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

    return tracks[0] ?? null;
}

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
            };
        };

    return {
        userPlaycount:
            Number(
                data.track
                    ?.userplaycount ?? 0
            ),

        listeners:
            Number(
                data.track
                    ?.listeners ?? 0
            ),

        globalPlaycount:
            Number(
                data.track
                    ?.playcount ?? 0
            ),
    };
}

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

    if (!data.artist?.name) {
        throw new Error(
            "Artist information not found"
        );
    }

    const rawTags =
        data.artist.tags?.tag;

    const tags =
        !rawTags
            ? []
            : (
                  Array.isArray(rawTags)
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
            data.artist.url ?? "",

        userPlaycount:
            Number(
                data.artist
                    .stats
                    ?.userplaycount ?? 0
            ),

        tags,
    };
}
export async function getTopArtists(
    username: string,
    period: TopArtistPeriod = "7day",
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
        data.topartists?.artist;

    if (!rawArtists) {
        return [];
    }

    const artists =
        Array.isArray(rawArtists)
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
                    artist.url ?? "",
            })
        );
}