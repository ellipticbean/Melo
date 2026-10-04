import type {
    ArtistInfo,
    TrackInfo,
} from "./lastfm.js";

// =================================================
// SUPPORTED COMPONENTS
// =================================================

export const FM_COMPONENTS = [
    "loved",
    "artist-plays",
    "track-plays",
    "scrobbles",
    "listeners",
    "artist-tags",
    "track-tags",
] as const;
// =================================================
// PRESETS
// =================================================

export const FM_PRESETS = {
    blank: [],

    default: [
        "artist-plays",
        "scrobbles",
        "artist-tags",
    ],

    verbose: [
        "loved",
        "artist-plays",
        "track-plays",
        "artist-tags",
        "track-tags",
    ],

    all: [
        ...FM_COMPONENTS,
    ],
} satisfies Record<
    string,
    readonly FmComponent[]
>;

export type FmPreset =
    keyof typeof FM_PRESETS;

export function getFmPreset(
    name: string
): FmComponent[] | null {
    const normalized =
        name
            .trim()
            .toLowerCase();

    if (
        !Object.prototype.hasOwnProperty.call(
            FM_PRESETS,
            normalized
        )
    ) {
        return null;
    }

    return [
        ...FM_PRESETS[
        normalized as FmPreset
        ],
    ];
}
export type FmComponent =
    (typeof FM_COMPONENTS)[number];

export const FM_COMPONENT_LABELS:
    Record<FmComponent, string> = {
    loved:
        "Loved",

    "artist-plays":
        "Artist plays",

    "track-plays":
        "Track plays",

    scrobbles:
        "Total scrobbles",

    listeners:
        "Last.fm listeners",

    "artist-tags":
        "Artist tags",

    "track-tags":
        "Track tags",
};

// =================================================
// CONFIG HELPERS
// =================================================

export function isFmComponent(
    value: string
): value is FmComponent {
    return (
        FM_COMPONENTS as readonly string[]
    ).includes(value);
}

export function normalizeFmConfig(
    config: string[]
): FmComponent[] {
    const selected =
        new Set<FmComponent>();

    for (const rawValue of config) {
        const value =
            rawValue
                .trim()
                .toLowerCase();

        if (
            isFmComponent(value)
        ) {
            selected.add(value);
        }
    }

    // Preserve Gowon-style component order.
    return FM_COMPONENTS.filter(
        (component) =>
            selected.has(component)
    );
}

// =================================================
// RENDERING
// =================================================

type FooterPiece = {
    text: string;
    size: number;
};

export type FmFooterData = {
    artistName: string;
    trackName: string;

    artistInfo:
    | ArtistInfo
    | null;

    trackInfo:
    | TrackInfo
    | null;

    totalScrobbles: number;
};

function pluralize(
    amount: number,
    singular: string,
    plural = `${singular}s`
): string {
    return (
        `${amount.toLocaleString()} ` +
        `${amount === 1
            ? singular
            : plural}`
    );
}

function normalizeTag(
    tag: string
): string {
    return tag
        .trim()
        .toLowerCase();
}

function getTags(
    config: FmComponent[],
    data: FmFooterData
): string[] {
    const tags: string[] = [];

    if (
        config.includes(
            "artist-tags"
        ) &&
        data.artistInfo
    ) {
        tags.push(
            ...data.artistInfo.tags
        );
    }

    if (
        config.includes(
            "track-tags"
        ) &&
        data.trackInfo
    ) {
        tags.push(
            ...data.trackInfo.tags
        );
    }

    const artistName =
        normalizeTag(
            data.artistName
        );

    const trackName =
        normalizeTag(
            data.trackName
        );

    const seen =
        new Set<string>();

    return tags
        .map(normalizeTag)
        .filter(Boolean)
        .filter(
            (tag) =>
                tag !== artistName &&
                tag !== trackName
        )
        .filter((tag) => {
            if (
                seen.has(tag)
            ) {
                return false;
            }

            seen.add(tag);

            return true;
        })
        .slice(
            0,
            8
        );
}

function buildFooterPieces(
    config: FmComponent[],
    data: FmFooterData
): FooterPiece[] {
    const pieces:
        FooterPiece[] = [];

    if (
        config.includes("loved") &&
        data.trackInfo?.loved
    ) {
        pieces.push({
            text: "💗",
            size: 1,
        });
    }

    if (
        config.includes(
            "artist-plays"
        ) &&
        data.artistInfo
    ) {
        pieces.push({
            text:
                pluralize(
                    data.artistInfo
                        .userPlaycount,
                    `${data.artistName} scrobble`,
                    `${data.artistName} scrobbles`
                ),

            size: 1,
        });
    }

    if (
        config.includes(
            "track-plays"
        ) &&
        data.trackInfo
    ) {
        pieces.push({
            text:
                pluralize(
                    data.trackInfo
                        .userPlaycount,
                    "track scrobble",
                    "track scrobbles"
                ),

            size: 1,
        });
    }

    if (
        config.includes(
            "scrobbles"
        )
    ) {
        pieces.push({
            text:
                pluralize(
                    data.totalScrobbles,
                    "total scrobble",
                    "total scrobbles"
                ),

            size: 1,
        });
    }

    if (
        config.includes(
            "listeners"
        )
    ) {
        const listeners =
            data.artistInfo
                ?.listeners ?? 0;

        pieces.push({
            text:
                pluralize(
                    listeners,
                    "Last.fm listener",
                    "Last.fm listeners"
                ),

            size: 1,
        });
    }

    const tags =
        getTags(
            config,
            data
        );

    if (tags.length > 0) {
        pieces.push({
            text:
                tags.join(
                    " • "
                ),

            // Gowon gives tags an
            // entire footer row.
            size: 3,
        });
    }

    return pieces;
}

function organizeRows(
    pieces: FooterPiece[]
): FooterPiece[][] {
    const ROW_SIZE = 3;

    const rows:
        FooterPiece[][] = [];

    for (
        const piece
        of pieces
    ) {
        const rowIndex =
            rows.findIndex(
                (row) => {
                    const used =
                        row.reduce(
                            (
                                total,
                                item
                            ) =>
                                total +
                                item.size,
                            0
                        );

                    return (
                        ROW_SIZE -
                        used >=
                        piece.size
                    );
                }
            );

        if (
            rowIndex >= 0
        ) {
            rows[
                rowIndex
            ].push(piece);
        } else {
            rows.push([
                piece,
            ]);
        }
    }

    return rows;
}

export function renderFmFooter(
    rawConfig: string[],
    data: FmFooterData
): string {
    const config =
        normalizeFmConfig(
            rawConfig
        );

    const pieces =
        buildFooterPieces(
            config,
            data
        );

    const rows =
        organizeRows(
            pieces
        );

    return rows
        .map(
            (row) =>
                row
                    .map(
                        (piece) =>
                            piece.text
                    )
                    .join(
                        " • "
                    )
        )
        .join(
            "\n"
        );
}