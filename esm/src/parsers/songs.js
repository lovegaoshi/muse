import { FEEDBACK_TOKEN, find_object_by_icon_name, MENU_ITEMS, NAVIGATION_BROWSE_ID, NAVIGATION_PAGE_TYPE, NAVIGATION_WATCH_PLAYLIST_ID, TOGGLE_MENU, } from "../nav.js";
import { MENU_LIKE_STATUS } from "../nav.js";
import { j, jo } from "../util.js";
import { _ } from "./browsing.js";
import { get_browse_id, get_flex_column_item, get_item_text, parse_duration, } from "./util.js";
export function parse_song_artists(data, index, slice) {
    const flex_item = get_flex_column_item(data, index);
    if (flex_item == null)
        return null;
    const runs = flex_item.text.runs;
    return parse_song_artists_runs(runs).slice(0, slice);
}
export function parse_song_artists_runs(runs) {
    const artists = [];
    const result = Array(Math.floor(runs.length / 2) + 1).fill(undefined).map((_, index) => index);
    for (const i of result) {
        const run = runs[i * 2];
        if (run == null)
            continue;
        const page_type = jo(run, NAVIGATION_PAGE_TYPE);
        artists.push({
            name: run.text,
            id: jo(run, NAVIGATION_BROWSE_ID),
            type: page_type === "MUSIC_PAGE_TYPE_ARTIST" ? "artist" : "channel",
        });
    }
    return artists;
}
export function parse_song_runs(runs, slice_start = 0) {
    const parsed = {
        artists: [],
        album: null,
        views: null,
        duration: null,
        duration_seconds: null,
        year: null,
    };
    const sliced = runs.slice(slice_start);
    for (const i in sliced) {
        const run = sliced[i];
        // uneven items are always separators
        if (Number(i) % 2) {
            continue;
        }
        const text = run.text;
        if ("navigationEndpoint" in run) {
            // artist or album
            const item = { name: text, id: jo(run, NAVIGATION_BROWSE_ID) };
            if (item.id &&
                (item.id.startsWith("MPRE") || item.id.includes("release_detail"))) {
                // album
                parsed.album = item;
            }
            else {
                // artist
                parsed.artists.push({
                    ...item,
                    type: jo(run, NAVIGATION_PAGE_TYPE) === "MUSIC_PAGE_TYPE_ARTIST"
                        ? "artist"
                        : "channel",
                });
            }
        }
        else {
            // note: YT uses non-breaking space \xa0 to separate number and magnitude
            if (text.match(/\d([^ ])* [^ ]*$/) && Number(i) > 0) {
                parsed.views = text;
            }
            else if (text.match(/^(\d+:)*\d+:\d+$/)) {
                parsed.duration = text;
                parsed.duration_seconds = parse_duration(text);
            }
            else if (text.match(/^\d{4}$/)) {
                parsed.year = text;
            }
            else if (text != _("video")) {
                // artist without id
                parsed.artists.push({
                    name: text,
                    id: null,
                    type: "artist",
                });
            }
        }
    }
    return parsed;
}
export function parse_song_album(data, index) {
    const flex_item = get_flex_column_item(data, index);
    if (flex_item == null)
        return null;
    return {
        name: get_item_text(data, index),
        id: get_browse_id(flex_item, 0),
    };
}
export function parse_song_menu_tokens(item) {
    const toggle_menu = item[TOGGLE_MENU], service_type = toggle_menu.defaultIcon.iconType;
    let library_add_token = jo(toggle_menu, `defaultServiceEndpoint.${FEEDBACK_TOKEN}`), library_remove_token = jo(toggle_menu, `toggledServiceEndpoint.${FEEDBACK_TOKEN}`);
    // swap if already in library
    if (service_type == "LIBRARY_SAVED") {
        [library_add_token, library_remove_token] = [
            library_remove_token,
            library_add_token,
        ];
    }
    return {
        add: library_add_token,
        remove: library_remove_token,
        saved: service_type == "LIBRARY_SAVED",
    };
}
export function get_menu_tokens(item) {
    const toggle_menu = find_object_by_icon_name(j(item, MENU_ITEMS), TOGGLE_MENU, [
        "LIBRARY_ADD",
        "LIBRARY_SAVED",
    ]);
    return toggle_menu ? parse_song_menu_tokens(toggle_menu) : null;
}
export function get_menu_like_status(item) {
    if (find_object_by_icon_name(j(item, MENU_ITEMS), TOGGLE_MENU, "FAVORITE")) {
        return "INDIFFERENT";
    }
    if (find_object_by_icon_name(j(item, MENU_ITEMS), TOGGLE_MENU, "UNFAVORITE")) {
        return "LIKE";
    }
    return null;
}
export function get_buttons_like_status(item) {
    return jo(item, MENU_LIKE_STATUS);
}
export function get_shuffle_and_radio_ids(item) {
    const shuffle = find_object_by_icon_name(jo(item, MENU_ITEMS), "menuNavigationItemRenderer", "MUSIC_SHUFFLE");
    const radio = find_object_by_icon_name(jo(item, MENU_ITEMS), "menuNavigationItemRenderer", "MIX");
    return {
        shuffleId: shuffle
            ? jo(shuffle, "menuNavigationItemRenderer", NAVIGATION_WATCH_PLAYLIST_ID)
            : null,
        radioId: radio
            ? jo(radio, "menuNavigationItemRenderer", NAVIGATION_WATCH_PLAYLIST_ID)
            : null,
    };
}
export function parse_menu_library_like_status(item) {
    const toggle_menu = item[TOGGLE_MENU], service_type = toggle_menu.defaultIcon.iconType;
    if (typeof service_type !== "string")
        return null;
    return service_type == "LIBRARY_SAVED" ? "LIKE" : "INDIFFERENT";
}
export function get_library_like_status(item) {
    const toggle_menu = find_object_by_icon_name(jo(item, MENU_ITEMS), TOGGLE_MENU, [
        "LIBRARY_ADD",
        "LIBRARY_SAVED",
    ]);
    return toggle_menu ? parse_menu_library_like_status(toggle_menu) : null;
}
export function parse_format(format) {
    const has_video = format.width && format.height;
    const has_audio = format.audioSampleRate;
    const parse_ranges = (ranges) => {
        if (!ranges)
            return ranges;
        return {
            start: Number(ranges.start),
            end: Number(ranges.end),
        };
    };
    const codecs = format.mimeType
        ? format.mimeType.match(/codecs="(.*)"/)[1]
        : null;
    const n = {
        codecs,
        itag: format.itag,
        url: format.url,
        bitrate: format.bitrate,
        modified: new Date(Number(format.lastModified) / 1000),
        content_length: Number(format.contentLength) ?? null,
        average_bitrate: Number(format.averageBitrate) ?? null,
        init_range: parse_ranges(format.initRange),
        index_range: parse_ranges(format.indexRange),
        duration_ms: Number(format.approxDurationMs) ?? null,
        projection_type: format.projectionType.toLowerCase() ?? null,
        mime_type: format.mimeType,
        has_audio: false,
        has_video: false,
        container: format.mimeType.split(";")[0].split("/")[1],
    };
    if (has_video) {
        Object.assign(n, {
            has_video: true,
            width: format.width,
            height: format.height,
            fps: format.fps,
            quality_label: format.qualityLabel,
            video_codec: codecs ? codecs.split(", ")[0] : null,
            video_quality: format.quality,
        });
    }
    if (has_audio) {
        Object.assign(n, {
            has_audio: true,
            sample_rate: format.audioSampleRate,
            audio_quality: format.audioQuality?.slice(14).toLowerCase(),
            quality: format.quality,
            channels: format.audioChannels,
            audio_codec: codecs ? codecs.split(", ").slice(-1)[0] : null,
        });
    }
    return n;
}
export function parse_like_status(service) {
    const status = ["LIKE", "INDIFFERENT"];
    return status[(status.indexOf(service) + 1) % status.length];
}
