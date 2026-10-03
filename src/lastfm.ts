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

    for (const [key, value] of Object.entries(params)) {
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
        name: data.user.name,
        url: data.user.url ?? "",
        playcount:
            data.user.playcount ?? "0",
    };
}

export async function getRecentTrack(
    username: string
): Promise<RecentTrack | null> {
    const data =
        (await requestLastFm({
            method:
                "user.getRecentTracks",
            user: username,
            limit: "1",
            extended: "1",
        })) as {
            recenttracks?: {
                track?:
                    | {
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
                      }
                    | Array<{
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
                      }>;
            };
        };

    const rawTrack =
        data.recenttracks?.track;

    if (!rawTrack) {
        return null;
    }

    const track =
        Array.isArray(rawTrack)
            ? rawTrack[0]
            : rawTrack;

    if (!track?.name) {
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
            ? Number(track.date.uts)
            : null;

    return {
        name: track.name,
        artist,
        album,
        url: track.url ?? "",
        imageUrl:
            image && image.length > 0
                ? image
                : null,
        nowPlaying,
        timestamp,
    };
}

export async function getTrackInfo(
    username: string,
    artist: string,
    track: string
): Promise<TrackInfo> {
    const data =
        (await requestLastFm({
            method: "track.getInfo",
            user: username,
            artist,
            track,
            autocorrect: "1",
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