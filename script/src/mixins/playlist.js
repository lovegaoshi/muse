"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.get_playlist_suggestions = get_playlist_suggestions;
exports.get_more_playlist_tracks = get_more_playlist_tracks;
exports.get_playlist = get_playlist;
exports.create_playlist = create_playlist;
exports.edit_playlist = edit_playlist;
exports.delete_playlist = delete_playlist;
exports.add_playlist_sources = add_playlist_sources;
exports.add_playlist_items = add_playlist_items;
exports.remove_playlist_items = remove_playlist_items;
exports.get_add_to_playlist = get_add_to_playlist;
const continuations_js_1 = require("../continuations.js");
const nav_js_1 = require("../nav.js");
const browsing_js_1 = require("../parsers/browsing.js");
const playlists_js_1 = require("../parsers/playlists.js");
const util_js_1 = require("../util.js");
const utils_js_1 = require("./utils.js");
const _request_js_1 = require("./_request.js");
const songs_js_1 = require("../parsers/songs.js");
const errors_js_1 = require("../errors.js");
const browsing_js_2 = require("../parsers/browsing.js");
async function get_playlist_suggestions(playlistId, continuation, options = {}, stopAfter = (tracks) => false) {
    const { signal, limit = 6 } = options;
    const browseId = playlistId.startsWith("VL") ? playlistId : `VL${playlistId}`;
    const data = { browseId };
    const endpoint = "browse";
    const continued_suggestions = await (0, continuations_js_1.get_continuations)(continuation, "musicShelfContinuation", limit, (params) => (0, _request_js_1.request_json)(endpoint, { data, params, signal }), (data) => (0, playlists_js_1.parse_playlist_items)(data), undefined, true);
    const suggestions = {
        suggestions: continued_suggestions.items,
        continuation: continued_suggestions.continuation,
    };
    return suggestions;
}
async function get_more_playlist_tracks(playlistId, continuation, options, stopAfter = (tracks) => false) {
    const { signal, limit = 100 } = options;
    const browseId = playlistId.startsWith("VL") ? playlistId : `VL${playlistId}`;
    const data = { browseId };
    const endpoint = "browse";
    const continued_data = await (0, continuations_js_1.get_continuations)(continuation, "musicPlaylistShelfContinuation", limit, (params) => (0, _request_js_1.request_json)(endpoint, { data, params, signal }), (contents) => (0, playlists_js_1.parse_playlist_items)(contents), undefined, undefined, stopAfter);
    const tracks = {
        tracks: continued_data.items,
        continuation: continued_data.continuation,
    };
    return tracks;
}
async function get_playlist(playlistId, options, stopAfter = (tracks) => false) {
    const { limit = 100, related = false, suggestions_limit = 0, signal } = options || {};
    const browseId = playlistId.startsWith("VL") ? playlistId : `VL${playlistId}`;
    const data = { browseId };
    const endpoint = "browse";
    const json = await (0, _request_js_1.request_json)(endpoint, { data, signal });
    const { tab, secondary } = (0, browsing_js_2.parse_two_columns)(json);
    const results = (0, util_js_1.j)(secondary, nav_js_1.SECTION_LIST_ITEM, "musicPlaylistShelfRenderer");
    const json_header = (0, util_js_1.j)(tab, nav_js_1.SECTION_LIST_ITEM);
    const header = (0, util_js_1.jo)(json_header, "musicEditablePlaylistDetailHeaderRenderer.header.musicResponsiveHeaderRenderer") ?? (0, util_js_1.j)(json_header, "musicResponsiveHeaderRenderer");
    const editHeader = (0, util_js_1.jo)(json_header, "musicEditablePlaylistDetailHeaderRenderer.editHeader.musicPlaylistEditHeaderRenderer");
    const own_playlist = !!editHeader;
    const run_count = header.subtitle.runs.length;
    const secondRuns = header.secondSubtitle.runs;
    const playlist = {
        id: results.playlistId,
        privacy: own_playlist ? editHeader.privacy : "PUBLIC",
        editable: own_playlist,
        title: (0, util_js_1.j)(header, nav_js_1.TITLE_TEXT),
        thumbnails: (0, util_js_1.j)(header, nav_js_1.THUMBNAILS),
        description: (0, util_js_1.jo)(header, "description", nav_js_1.DESCRIPTION_SHELF, nav_js_1.DESCRIPTION),
        type: run_count > 0 ? (0, util_js_1.j)(header, nav_js_1.SUBTITLE) : null,
        authors: (0, songs_js_1.parse_song_artists_runs)(header.straplineTextOne.runs),
        year: (0, util_js_1.j)(header, "subtitle.runs", (run_count - 1).toString(), "text"),
        trackCount: secondRuns ? secondRuns[0].text : null,
        duration: secondRuns && secondRuns.length > 2 ? secondRuns[2].text : null,
        duration_seconds: 0,
        tracks: (0, playlists_js_1.parse_playlist_items)(results.contents ?? []),
        continuation: null,
        suggestions: [],
        suggestions_continuation: null,
        related: [],
    };
    const request = (params) => (0, _request_js_1.request_json)(endpoint, { data, params, signal });
    // suggestions and related are missing e.g. on liked songs
    const section_list = (0, util_js_1.j)(secondary, "sectionListRenderer");
    if ("continuations" in section_list) {
        let params = (0, continuations_js_1.get_continuation_params)(section_list);
        if (params.continuation && own_playlist && (suggestions_limit > 0 || related)) {
            const suggested = await request(params);
            const continuation = (0, util_js_1.j)(suggested, nav_js_1.SECTION_LIST_CONTINUATION);
            params = (0, continuations_js_1.get_continuation_params)(continuation);
            const suggestions_shelf = (0, util_js_1.j)(continuation, nav_js_1.CONTENT, nav_js_1.MUSIC_SHELF);
            playlist.suggestions = (0, continuations_js_1.get_continuation_contents)(suggestions_shelf, (results) => (0, playlists_js_1.parse_playlist_items)(results));
            playlist.suggestions_continuation = (0, util_js_1.j)(suggestions_shelf, "continuations.0.reloadContinuationData.continuation");
            const continued_suggestions = await get_playlist_suggestions(playlistId, suggestions_shelf, {
                limit: suggestions_limit - playlist.suggestions.length,
                signal,
            });
            playlist.suggestions.push(...continued_suggestions.suggestions);
            playlist.suggestions_continuation = continued_suggestions.continuation;
        }
        if (params.continuation && related) {
            const response = await request(params);
            const continuation = (0, util_js_1.jo)(response, nav_js_1.SECTION_LIST_CONTINUATION);
            if (continuation) {
                playlist.related = (0, continuations_js_1.get_continuation_contents)((0, util_js_1.j)(continuation, nav_js_1.CONTENT, nav_js_1.CAROUSEL), (results) => (0, browsing_js_1.parse_content_list)(results, browsing_js_1.parse_playlist));
            }
        }
    }
    if ("continuations" in results && !stopAfter(playlist.tracks)) {
        const continued_data = await get_more_playlist_tracks(playlistId, results, {
            limit: limit - playlist.tracks.length,
            signal,
        }, stopAfter);
        playlist.tracks.push(...continued_data.tracks);
        playlist.continuation = continued_data.continuation;
    }
    playlist.duration_seconds = (0, util_js_1.sum_total_duration)(playlist);
    return playlist;
}
async function create_playlist(title, options = {}) {
    const { description = "", privacy_status = "PUBLIC", video_ids, source_playlist, signal, } = options;
    await (0, utils_js_1.check_auth)();
    const data = {
        title,
        description: (0, utils_js_1.html_to_text)(description),
        privacyStatus: privacy_status,
    };
    if (video_ids && video_ids.length > 0) {
        data.videoIds = video_ids;
    }
    if (source_playlist) {
        data.sourcePlaylistId = source_playlist;
    }
    const json = await (0, _request_js_1.request_json)("playlist/create", { data, signal });
    return json.playlistId;
}
async function edit_playlist(playlistId, options) {
    const { title, description, privacy_status, move_items, add_videos, remove_videos, add_source_playlists, dedupe, signal, } = options;
    await (0, utils_js_1.check_auth)();
    const data = {
        playlistId: (0, playlists_js_1.validate_playlist_id)(playlistId),
    };
    const actions = [];
    const dedupeOption = dedupe === "check"
        ? "DEDUPE_OPTION_CHECK"
        : dedupe === "drop_duplicate"
            ? "DEDUPE_OPTION_DROP_DUPLICATE"
            : dedupe === "skip"
                ? "DEDUPE_OPTION_SKIP"
                : null;
    if (title) {
        actions.push({
            action: "ACTION_SET_PLAYLIST_NAME",
            playlistName: title,
        });
    }
    if (description) {
        actions.push({
            action: "ACTION_SET_PLAYLIST_DESCRIPTION",
            playlistDescription: description,
        });
    }
    if (privacy_status) {
        actions.push({
            action: "ACTION_SET_PLAYLIST_PRIVACY",
            playlistPrivacy: privacy_status,
        });
    }
    if (move_items) {
        move_items.forEach((move_item) => {
            actions.push({
                action: "ACTION_MOVE_VIDEO_BEFORE",
                setVideoId: move_item.setVideoId,
                movedSetVideoIdSuccessor: move_item.positionBefore,
            });
        });
    }
    if (add_videos) {
        add_videos.forEach((video_id) => {
            actions.push({
                action: "ACTION_ADD_VIDEO",
                addedVideoId: video_id,
                dedupeOption,
            });
        });
    }
    if (remove_videos) {
        remove_videos.forEach((remove_video) => {
            if (remove_video.setVideoId != null) {
                actions.push({
                    action: "ACTION_REMOVE_VIDEO",
                    removedVideoId: remove_video.videoId,
                    setVideoId: remove_video.setVideoId,
                });
            }
            else {
                actions.push({
                    action: "ACTION_REMOVE_VIDEO_BY_VIDEO_ID",
                    removedVideoId: remove_video.videoId,
                    setVideoId: remove_video.setVideoId,
                });
            }
        });
    }
    if (add_source_playlists) {
        add_source_playlists.forEach((playlist_id) => {
            actions.push({
                action: "ACTION_ADD_PLAYLIST",
                addedFullListId: playlist_id,
                dedupeOption,
            });
        });
    }
    data.actions = actions;
    const json = await (0, _request_js_1.request_json)("browse/edit_playlist", { data, signal });
    const result = {
        added: [],
        status: json.status,
    };
    if ("playlistEditResults" in json) {
        for (const item of json.playlistEditResults) {
            if ("playlistEditVideoAddedResultData" in item) {
                const added = item.playlistEditVideoAddedResultData;
                result.added.push({
                    videoId: (0, util_js_1.j)(added, "videoId"),
                    setVideoId: (0, util_js_1.j)(added, "setVideoId"),
                });
            }
        }
    }
    return result;
}
async function delete_playlist(playlistId, options = {}) {
    await (0, utils_js_1.check_auth)();
    const data = {
        playlistId: (0, playlists_js_1.validate_playlist_id)(playlistId),
    };
    const json = await (0, _request_js_1.request_json)("playlist/delete", {
        data,
        signal: options.signal,
    });
    return json.status;
}
function add_playlist_sources(playlistId, source_playlists, options = {}) {
    return edit_playlist(playlistId, {
        add_source_playlists: source_playlists,
        ...options,
    });
}
function add_playlist_items(playlistId, video_ids, options = {}) {
    return edit_playlist(playlistId, { add_videos: video_ids, ...options });
}
function remove_playlist_items(playlistId, video_ids, options = {}) {
    return edit_playlist(playlistId, {
        remove_videos: video_ids,
        ...options,
    });
}
async function get_add_to_playlist(videoIds, playlistId = null, options = {}) {
    await (0, utils_js_1.check_auth)();
    const { signal } = options;
    const endpoint = "playlist/get_add_to_playlist";
    const data = {
        excludeWatchLater: true,
    };
    if (videoIds != null) {
        data.videoIds = videoIds;
    }
    else if (playlistId != null) {
        data.playlistId = playlistId;
    }
    else {
        throw new errors_js_1.MuseError(errors_js_1.ERROR_CODE.INVALID_PARAMETER, "Either videoIds or playlistId must be provided");
    }
    const result = {
        recents: [],
        playlists: [],
    };
    const json = await (0, _request_js_1.request_json)(endpoint, { data, signal });
    const contents = (0, util_js_1.j)(json, "contents.0.addToPlaylistRenderer");
    const recents = (0, util_js_1.j)(contents, "topShelf.musicCarouselShelfRenderer.contents");
    for (const recent of recents) {
        const item = recent.musicTwoRowItemRenderer;
        if (!item) {
            continue;
        }
        result.recents.push({
            thumbnails: (0, util_js_1.j)(item, nav_js_1.THUMBNAIL_RENDERER),
            playlistId: (0, util_js_1.j)(item, "navigationEndpoint.playlistEditEndpoint.playlistId"),
            songs: (0, util_js_1.j)(item, nav_js_1.SUBTITLE),
            title: (0, util_js_1.j)(item, nav_js_1.TITLE_TEXT),
        });
    }
    const playlists = (0, util_js_1.j)(contents, "playlists");
    for (const playlist of playlists) {
        const item = playlist.playlistAddToOptionRenderer;
        if (!item) {
            continue;
        }
        // Liked songs "LM" doesn't have a playlistId
        result.playlists.push({
            thumbnails: (0, util_js_1.j)(item, nav_js_1.THUMBNAIL_RENDERER),
            playlistId: (0, util_js_1.jo)(item, "navigationEndpoint.playlistEditEndpoint.playlistId") ?? "LM",
            songs: (0, util_js_1.j)(item, "shortBylineText.runs").map((run) => run.text).join(""),
            title: (0, util_js_1.j)(item, nav_js_1.TITLE_TEXT),
        });
    }
    return result;
}
