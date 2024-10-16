import { ParsedPlaylist } from "../parsers/browsing.js";
import { PlaylistItem } from "../parsers/playlists.js";
import { AbortOptions, PaginationOptions } from "./utils.js";
import { ArtistRun } from "../parsers/songs.js";
export type { PlaylistItem };
export interface GetPlaylistOptions extends AbortOptions {
    limit?: number;
    suggestions_limit?: number;
    related?: boolean;
}
export interface Thumbnail {
    url: string;
    width: number;
    height: number;
}
export interface Playlist {
    id: string;
    privacy: "PUBLIC" | "PRIVATE" | "UNLISTED";
    editable: boolean;
    title: string;
    thumbnails: Thumbnail[];
    description: string | null;
    authors: ArtistRun[];
    /** can be `Playlist`, `Chart` or `Radio` */
    type: string;
    year: string | null;
    trackCount: number | null;
    duration: string | null;
    duration_seconds: number;
    tracks: PlaylistItem[];
    continuation: string | null;
    suggestions: PlaylistItem[];
    suggestions_continuation: string | null;
    related: ParsedPlaylist[];
}
export interface PlaylistSuggestions {
    suggestions: PlaylistItem[];
    continuation: string | null;
}
export declare function get_playlist_suggestions(playlistId: string, continuation: string, options?: Omit<PaginationOptions, "continuation">, stopAfter?: (tracks: PlaylistItem[]) => boolean): Promise<PlaylistSuggestions>;
export interface MorePlaylistTracks {
    tracks: PlaylistItem[];
    continuation: string | null;
}
export declare function get_more_playlist_tracks(playlistId: string, continuation: string, options: Omit<PaginationOptions, "continuation">, stopAfter?: (tracks: PlaylistItem[]) => boolean): Promise<MorePlaylistTracks>;
export declare function get_playlist(playlistId: string, options?: GetPlaylistOptions, stopAfter?: (tracks: PlaylistItem[]) => boolean): Promise<Playlist>;
type PlaylistPrivacyStatus = "PUBLIC" | "PRIVATE" | "UNLISTED";
interface CreatePlaylistOptions extends AbortOptions {
    description?: string;
    privacy_status?: PlaylistPrivacyStatus;
    video_ids?: string[];
    source_playlist?: string;
}
export declare function create_playlist(title: string, options?: CreatePlaylistOptions): Promise<string>;
export interface EditPlaylistOptions extends AbortOptions {
    title?: string;
    description?: string;
    privacy_status?: PlaylistPrivacyStatus;
    move_items?: {
        setVideoId: string;
        positionBefore?: string;
    }[];
    add_videos?: string[];
    remove_videos?: {
        videoId: string;
        setVideoId?: string;
    }[];
    add_source_playlists?: string[];
    dedupe?: "check" | "drop_duplicate" | "skip";
}
export type EditPlaylistStatus = "STATUS_SUCCEEDED" | "STATUS_FAILED";
export interface EditPlaylistResult {
    status: EditPlaylistStatus;
    added: {
        videoId: string;
        setVideoId: string;
    }[];
}
export declare function edit_playlist(playlistId: string, options: EditPlaylistOptions): Promise<EditPlaylistResult>;
export declare function delete_playlist(playlistId: string, options?: AbortOptions): Promise<EditPlaylistStatus>;
export interface AddPlaylistOptions extends AbortOptions {
    dedupe?: EditPlaylistOptions["dedupe"];
}
export declare function add_playlist_sources(playlistId: string, source_playlists: string[], options?: AddPlaylistOptions): Promise<EditPlaylistResult>;
export declare function add_playlist_items(playlistId: string, video_ids: string[], options?: AddPlaylistOptions): Promise<EditPlaylistResult>;
export declare function remove_playlist_items(playlistId: string, video_ids: {
    videoId: string;
    setVideoId: string;
}[], options?: AbortOptions): Promise<EditPlaylistResult>;
export interface AddToPlaylistItem {
    playlistId: string;
    title: string;
    thumbnails: Thumbnail[];
    songs: string;
}
export interface AddToPlaylist {
    recents: AddToPlaylistItem[];
    playlists: AddToPlaylistItem[];
}
export declare function get_add_to_playlist(videoIds: string[] | null, playlistId?: string | null, options?: AbortOptions): Promise<AddToPlaylist>;
//# sourceMappingURL=playlist.d.ts.map