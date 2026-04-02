import rawAlbums from "@/data/songs.json";

export type SongTrack = {
  id: string;
  trackNumber: number;
  title: string;
};

export type SongAlbum = {
  album: string;
  art: string;
  tracks: SongTrack[];
};

export type Song = SongTrack & {
  album: string;
  art: string;
};

export const songAlbums: SongAlbum[] = rawAlbums as SongAlbum[];

export const allSongs: Song[] = songAlbums.flatMap((album) =>
  album.tracks.map((track) => ({
    ...track,
    album: album.album,
    art: album.art,
  }))
);

export const songsById = new Map<string, Song>(allSongs.map((song) => [song.id, song]));

export function getSongById(id: string): Song | null {
  return songsById.get(id) ?? null;
}

export function getAlbumNames(): string[] {
  return songAlbums.map((album) => album.album);
}
