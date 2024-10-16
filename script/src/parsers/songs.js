"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parse_song_artists = parse_song_artists;
exports.parse_song_artists_runs = parse_song_artists_runs;
exports.parse_song_runs = parse_song_runs;
exports.parse_song_album = parse_song_album;
exports.parse_song_menu_tokens = parse_song_menu_tokens;
exports.get_menu_tokens = get_menu_tokens;
exports.get_menu_like_status = get_menu_like_status;
exports.get_buttons_like_status = get_buttons_like_status;
exports.get_shuffle_and_radio_ids = get_shuffle_and_radio_ids;
exports.parse_menu_library_like_status = parse_menu_library_like_status;
exports.get_library_like_status = get_library_like_status;
exports.parse_format = parse_format;
exports.parse_like_status = parse_like_status;
const nav_js_1 = require("../nav.js");
const nav_js_2 = require("../nav.js");
const util_js_1 = require("../util.js");
const browsing_js_1 = require("./browsing.js");
const util_js_2 = require("./util.js");
function parse_song_artists(data, index, slice) {
    const flex_item = (0, util_js_2.get_flex_column_item)(data, index);
    if (flex_item == null)
        return null;
    const runs = flex_item.text.runs;
    return parse_song_artists_runs(runs).slice(0, slice);
}
function parse_song_artists_runs(runs) {
    const artists = [];
    const result = Array(Math.floor(runs.length / 2) + 1).fill(undefined).map((_, index) => index);
    for (const i of result) {
        const run = runs[i * 2];
        if (run == null)
            continue;
        const page_type = (0, util_js_1.jo)(run, nav_js_1.NAVIGATION_PAGE_TYPE);
        artists.push({
            name: run.text,
            id: (0, util_js_1.jo)(run, nav_js_1.NAVIGATION_BROWSE_ID),
            type: page_type === "MUSIC_PAGE_TYPE_ARTIST" ? "artist" : "channel",
        });
    }
    return artists;
}
function parse_song_runs(runs, slice_start = 0) {
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
            const item = { name: text, id: (0, util_js_1.jo)(run, nav_js_1.NAVIGATION_BROWSE_ID) };
            if (item.id &&
                (item.id.startsWith("MPRE") || item.id.includes("release_detail"))) {
                // album
                parsed.album = item;
            }
            else {
                // artist
                parsed.artists.push({
                    ...item,
                    type: (0, util_js_1.jo)(run, nav_js_1.NAVIGATION_PAGE_TYPE) === "MUSIC_PAGE_TYPE_ARTIST"
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
                parsed.duration_seconds = (0, util_js_2.parse_duration)(text);
            }
            else if (text.match(/^\d{4}$/)) {
                parsed.year = text;
            }
            else if (text != (0, browsing_js_1._)("video")) {
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
function parse_song_album(data, index) {
    const flex_item = (0, util_js_2.get_flex_column_item)(data, index);
    if (flex_item == null)
        return null;
    return {
        name: (0, util_js_2.get_item_text)(data, index),
        id: (0, util_js_2.get_browse_id)(flex_item, 0),
    };
}
function parse_song_menu_tokens(item) {
    const toggle_menu = item[nav_js_1.TOGGLE_MENU], service_type = toggle_menu.defaultIcon.iconType;
    let library_add_token = (0, util_js_1.jo)(toggle_menu, `defaultServiceEndpoint.${nav_js_1.FEEDBACK_TOKEN}`), library_remove_token = (0, util_js_1.jo)(toggle_menu, `toggledServiceEndpoint.${nav_js_1.FEEDBACK_TOKEN}`);
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
function get_menu_tokens(item) {
    const toggle_menu = (0, nav_js_1.find_object_by_icon_name)((0, util_js_1.j)(item, nav_js_1.MENU_ITEMS), nav_js_1.TOGGLE_MENU, [
        "LIBRARY_ADD",
        "LIBRARY_SAVED",
    ]);
    return toggle_menu ? parse_song_menu_tokens(toggle_menu) : null;
}
function get_menu_like_status(item) {
    if ((0, nav_js_1.find_object_by_icon_name)((0, util_js_1.j)(item, nav_js_1.MENU_ITEMS), nav_js_1.TOGGLE_MENU, "FAVORITE")) {
        return "INDIFFERENT";
    }
    if ((0, nav_js_1.find_object_by_icon_name)((0, util_js_1.j)(item, nav_js_1.MENU_ITEMS), nav_js_1.TOGGLE_MENU, "UNFAVORITE")) {
        return "LIKE";
    }
    return null;
}
function get_buttons_like_status(item) {
    return (0, util_js_1.jo)(item, nav_js_2.MENU_LIKE_STATUS);
}
function get_shuffle_and_radio_ids(item) {
    const shuffle = (0, nav_js_1.find_object_by_icon_name)((0, util_js_1.jo)(item, nav_js_1.MENU_ITEMS), "menuNavigationItemRenderer", "MUSIC_SHUFFLE");
    const radio = (0, nav_js_1.find_object_by_icon_name)((0, util_js_1.jo)(item, nav_js_1.MENU_ITEMS), "menuNavigationItemRenderer", "MIX");
    return {
        shuffleId: shuffle
            ? (0, util_js_1.jo)(shuffle, "menuNavigationItemRenderer", nav_js_1.NAVIGATION_WATCH_PLAYLIST_ID)
            : null,
        radioId: radio
            ? (0, util_js_1.jo)(radio, "menuNavigationItemRenderer", nav_js_1.NAVIGATION_WATCH_PLAYLIST_ID)
            : null,
    };
}
function parse_menu_library_like_status(item) {
    const toggle_menu = item[nav_js_1.TOGGLE_MENU], service_type = toggle_menu.defaultIcon.iconType;
    if (typeof service_type !== "string")
        return null;
    return service_type == "LIBRARY_SAVED" ? "LIKE" : "INDIFFERENT";
}
function get_library_like_status(item) {
    const toggle_menu = (0, nav_js_1.find_object_by_icon_name)((0, util_js_1.jo)(item, nav_js_1.MENU_ITEMS), nav_js_1.TOGGLE_MENU, [
        "LIBRARY_ADD",
        "LIBRARY_SAVED",
    ]);
    return toggle_menu ? parse_menu_library_like_status(toggle_menu) : null;
}
function parse_format(format) {
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
function parse_like_status(service) {
    const status = ["LIKE", "INDIFFERENT"];
    return status[(status.indexOf(service) + 1) % status.length];
}
