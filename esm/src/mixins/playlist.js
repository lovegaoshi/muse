import { get_continuation_contents, get_continuation_params, get_continuations, } from "../continuations.js";
import { CAROUSEL, CONTENT, DESCRIPTION, DESCRIPTION_SHELF, MUSIC_SHELF, SECTION_LIST_CONTINUATION, SECTION_LIST_ITEM, SUBTITLE, THUMBNAIL_RENDERER, THUMBNAILS, TITLE_TEXT, } from "../nav.js";
import { parse_content_list, parse_playlist, } from "../parsers/browsing.js";
import { parse_playlist_items, validate_playlist_id, } from "../parsers/playlists.js";
import { j, jo, sum_total_duration } from "../util.js";
import { check_auth, html_to_text, } from "./utils.js";
import { request_json } from "./_request.js";
import { parse_song_artists_runs } from "../parsers/songs.js";
import { ERROR_CODE, MuseError } from "../errors.js";
import { parse_two_columns } from "../parsers/browsing.js";
export async function get_playlist_suggestions(playlistId, continuation, options = {}, stopAfter = (tracks) => false) {
    const { signal, limit = 6 } = options;
    const browseId = playlistId.startsWith("VL") ? playlistId : `VL${playlistId}`;
    const data = { browseId };
    const endpoint = "browse";
    const continued_suggestions = await get_continuations(continuation, "musicShelfContinuation", limit, (params) => request_json(endpoint, { data, params, signal }), (data) => parse_playlist_items(data), undefined, true);
    const suggestions = {
        suggestions: continued_suggestions.items,
        continuation: continued_suggestions.continuation,
    };
    return suggestions;
}
export async function get_more_playlist_tracks(playlistId, continuation, options, stopAfter = (tracks) => false) {
    const { signal, limit = 100 } = options;
    const browseId = playlistId.startsWith("VL") ? playlistId : `VL${playlistId}`;
    const data = { browseId };
    const endpoint = "browse";
    const continued_data = await get_continuations(continuation, "musicPlaylistShelfContinuation", limit, (params) => request_json(endpoint, { data, params, signal }), (contents) => parse_playlist_items(contents), undefined, undefined, stopAfter);
    const tracks = {
        tracks: continued_data.items,
        continuation: continued_data.continuation,
    };
    return tracks;
}
export async function get_playlist(playlistId, options, stopAfter = (tracks) => false) {
    const { limit = 100, related = false, suggestions_limit = 0, signal } = options || {};
    const browseId = playlistId.startsWith("VL") ? playlistId : `VL${playlistId}`;
    const data = { browseId };
    const endpoint = "browse";
    const json = await request_json(endpoint, { data, signal });
    const { tab, secondary } = parse_two_columns(json);
    const results = j(secondary, SECTION_LIST_ITEM, "musicPlaylistShelfRenderer");
    const json_header = j(tab, SECTION_LIST_ITEM);
    const header = jo(json_header, "musicEditablePlaylistDetailHeaderRenderer.header.musicResponsiveHeaderRenderer") ?? j(json_header, "musicResponsiveHeaderRenderer");
    const editHeader = jo(json_header, "musicEditablePlaylistDetailHeaderRenderer.editHeader.musicPlaylistEditHeaderRenderer");
    const own_playlist = !!editHeader;
    const run_count = header.subtitle.runs.length;
    const secondRuns = header.secondSubtitle.runs;
    const playlist = {
        id: results.playlistId,
        privacy: own_playlist ? editHeader.privacy : "PUBLIC",
        editable: own_playlist,
        title: j(header, TITLE_TEXT),
        thumbnails: j(header, THUMBNAILS),
        description: jo(header, "description", DESCRIPTION_SHELF, DESCRIPTION),
        type: run_count > 0 ? j(header, SUBTITLE) : null,
        authors: parse_song_artists_runs(header.straplineTextOne.runs),
        year: j(header, "subtitle.runs", (run_count - 1).toString(), "text"),
        trackCount: secondRuns ? secondRuns[0].text : null,
        duration: secondRuns && secondRuns.length > 2 ? secondRuns[2].text : null,
        duration_seconds: 0,
        tracks: parse_playlist_items(results.contents ?? []),
        continuation: null,
        suggestions: [],
        suggestions_continuation: null,
        related: [],
    };
    const request = (params) => request_json(endpoint, { data, params, signal });
    // suggestions and related are missing e.g. on liked songs
    const section_list = j(secondary, "sectionListRenderer");
    if ("continuations" in section_list) {
        let params = get_continuation_params(section_list);
        if (params.continuation && own_playlist && (suggestions_limit > 0 || related)) {
            const suggested = await request(params);
            const continuation = j(suggested, SECTION_LIST_CONTINUATION);
            params = get_continuation_params(continuation);
            const suggestions_shelf = j(continuation, CONTENT, MUSIC_SHELF);
            playlist.suggestions = get_continuation_contents(suggestions_shelf, (results) => parse_playlist_items(results));
            playlist.suggestions_continuation = j(suggestions_shelf, "continuations.0.reloadContinuationData.continuation");
            const continued_suggestions = await get_playlist_suggestions(playlistId, suggestions_shelf, {
                limit: suggestions_limit - playlist.suggestions.length,
                signal,
            });
            playlist.suggestions.push(...continued_suggestions.suggestions);
            playlist.suggestions_continuation = continued_suggestions.continuation;
        }
        if (params.continuation && related) {
            const response = await request(params);
            const continuation = jo(response, SECTION_LIST_CONTINUATION);
            if (continuation) {
                playlist.related = get_continuation_contents(j(continuation, CONTENT, CAROUSEL), (results) => parse_content_list(results, parse_playlist));
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
    playlist.duration_seconds = sum_total_duration(playlist);
    return playlist;
}
export async function create_playlist(title, options = {}) {
    const { description = "", privacy_status = "PUBLIC", video_ids, source_playlist, signal, } = options;
    await check_auth();
    const data = {
        title,
        description: html_to_text(description),
        privacyStatus: privacy_status,
    };
    if (video_ids && video_ids.length > 0) {
        data.videoIds = video_ids;
    }
    if (source_playlist) {
        data.sourcePlaylistId = source_playlist;
    }
    const json = await request_json("playlist/create", { data, signal });
    return json.playlistId;
}
export async function edit_playlist(playlistId, options) {
    const { title, description, privacy_status, move_items, add_videos, remove_videos, add_source_playlists, dedupe, signal, } = options;
    await check_auth();
    const data = {
        playlistId: validate_playlist_id(playlistId),
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
    const json = await request_json("browse/edit_playlist", { data, signal });
    const result = {
        added: [],
        status: json.status,
    };
    if ("playlistEditResults" in json) {
        for (const item of json.playlistEditResults) {
            if ("playlistEditVideoAddedResultData" in item) {
                const added = item.playlistEditVideoAddedResultData;
                result.added.push({
                    videoId: j(added, "videoId"),
                    setVideoId: j(added, "setVideoId"),
                });
            }
        }
    }
    return result;
}
export async function delete_playlist(playlistId, options = {}) {
    await check_auth();
    const data = {
        playlistId: validate_playlist_id(playlistId),
    };
    const json = await request_json("playlist/delete", {
        data,
        signal: options.signal,
    });
    return json.status;
}
export function add_playlist_sources(playlistId, source_playlists, options = {}) {
    return edit_playlist(playlistId, {
        add_source_playlists: source_playlists,
        ...options,
    });
}
export function add_playlist_items(playlistId, video_ids, options = {}) {
    return edit_playlist(playlistId, { add_videos: video_ids, ...options });
}
export function remove_playlist_items(playlistId, video_ids, options = {}) {
    return edit_playlist(playlistId, {
        remove_videos: video_ids,
        ...options,
    });
}
export async function get_add_to_playlist(videoIds, playlistId = null, options = {}) {
    await check_auth();
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
        throw new MuseError(ERROR_CODE.INVALID_PARAMETER, "Either videoIds or playlistId must be provided");
    }
    const result = {
        recents: [],
        playlists: [],
    };
    const json = await request_json(endpoint, { data, signal });
    const contents = j(json, "contents.0.addToPlaylistRenderer");
    const recents = j(contents, "topShelf.musicCarouselShelfRenderer.contents");
    for (const recent of recents) {
        const item = recent.musicTwoRowItemRenderer;
        if (!item) {
            continue;
        }
        result.recents.push({
            thumbnails: j(item, THUMBNAIL_RENDERER),
            playlistId: j(item, "navigationEndpoint.playlistEditEndpoint.playlistId"),
            songs: j(item, SUBTITLE),
            title: j(item, TITLE_TEXT),
        });
    }
    const playlists = j(contents, "playlists");
    for (const playlist of playlists) {
        const item = playlist.playlistAddToOptionRenderer;
        if (!item) {
            continue;
        }
        // Liked songs "LM" doesn't have a playlistId
        result.playlists.push({
            thumbnails: j(item, THUMBNAIL_RENDERER),
            playlistId: jo(item, "navigationEndpoint.playlistEditEndpoint.playlistId") ?? "LM",
            songs: j(item, "shortBylineText.runs").map((run) => run.text).join(""),
            title: j(item, TITLE_TEXT),
        });
    }
    return result;
}
