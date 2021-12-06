import Dexie from 'dexie';

interface MODEL {
  new (): unknown;
  INDEX_STRING: string;
}

class Track {
  id!: string;
  playlist!: string;
  title?: string;
  artist?: string;
  artist_id?: string;
  album?: string;
  album_id?: string;
  img_url?: string;
  source?: string;
  // source_url: String,
  // lyric_url: String,
  disabled?: string;

  static readonly INDEX_STRING = '&[playlist+id], playlist, id, title, artist, artist_id, album, album_id, source, disabled';

  [key: string]: unknown;
}

class Setting {
  key!: string;
  value!: unknown;

  static readonly INDEX_STRING = '&key';
}

export class Playlist {
  id!: string;
  title!: string;
  cover_img_url!: string;
  source_url?: string;
  type!: 'current' | 'favorite' | 'my' | 'local';
  order!: string[];

  static readonly INDEX_STRING = '&id, type';
}

const models: { [key: string]: MODEL } = {
  Tracks: Track,
  Settings: Setting,
  Playlists: Playlist
};

export class L1DB extends Dexie {
  Tracks!: Dexie.Table<Track, [string, string]>;
  Settings!: Dexie.Table<Setting, [string]>;
  Playlists!: Dexie.Table<Playlist, [string]>;

  constructor() {
    super('Listen1');
    const schema = Object.entries(models).reduce((ret: { [key: string]: string }, cur) => {
      ret[cur[0]] = cur[1].INDEX_STRING;
      return ret;
    }, {});
    this.version(1).stores(schema);
    this.Tracks.mapToClass(Track);
  }
}

const iDB = new L1DB();
iDB.open();

iDB.tables.forEach((table) => {
  const keys = [...Object.getOwnPropertyNames(new models[table.name]())];
  function createHook(primKey: unknown, originalObj: Record<string, unknown>) {
    const formattedObj = { ...originalObj };
    Object.keys(formattedObj).forEach((key) => (keys.includes(key) ? null : delete formattedObj[key]));
    originalObj = formattedObj;
  }
  function updateHook(mod: any) {
    const formattedObj = { ...mod };
    Object.keys(formattedObj).forEach((key) => (keys.includes(key) ? null : delete formattedObj[key]));
    mod = formattedObj;
  }
  table.hook('creating', createHook);
  table.hook('updating', updateHook);
});

// default items
iDB.Playlists.get({ id: 'current' }).then((playlist) => {
  if (!playlist) {
    iDB.Playlists.put({
      id: 'current',
      title: 'current',
      cover_img_url: 'images/mycover.jpg',
      type: 'current',
      order: []
    });
  }
});
iDB.Playlists.get({ id: 'lmplaylist_reserve' }).then((playlist) => {
  if (!playlist) {
    iDB.Playlists.put({
      id: 'lmplaylist_reserve',
      title: '本地音乐',
      cover_img_url: 'images/mycover.jpg',
      type: 'local',
      order: []
    });
  }
});
iDB.Settings.bulkAdd([
  {
    key: 'favorite_playlist_order',
    value: []
  },
  {
    key: 'my_playlist_order',
    value: []
  }
]);

function migratePlaylist(tracks: any, newId: string, newTitle: string, newType: 'current' | 'favorite' | 'my' | 'local') {
  iDB.Playlists.put({
    id: newId,
    title: newTitle,
    cover_img_url: 'images/mycover.jpg',
    type: newType,
    order: tracks.map((i: Record<string, unknown>) => i.id)
  });
  tracks.forEach((track: Record<string, unknown>) => (track.playlist = newId));
  iDB.Tracks.bulkPut(tracks);
}

export function dbMigrate() {
  let tracks = JSON.parse(localStorage.getItem('current-playing') || '[]');
  migratePlaylist(tracks, 'current', 'current', 'current');
  const localmusicPlaylist = JSON.parse(localStorage.getItem('lmplaylist_reserve') || '{}');
  tracks = localmusicPlaylist['tracks'] || [];
  migratePlaylist(tracks, 'lmplaylist_reserve', '本地音乐', 'local');
  localStorage.setItem('V3_MIGRATED', 'true');
}

export default iDB;
