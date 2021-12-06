import { getParameterByName } from './lowebutil';
import iDB from '../services/DBService';
import EventService from '../services/EventService';
import { arrayMove } from '../utils';
export default class MyPlaylist {
  static getPlaylistObjectKey(playlist_type) {
    let key = '';
    if (playlist_type === 'my') {
      key = 'c';
    } else if (playlist_type === 'favorite') {
      key = 'favorite';
    }
    return key;
  }
  static async getMyplaylistsList(playlist_type) {
    const order = await iDB.Settings.get({ key: playlist_type + '_playlist_order' });
    let playlists = await iDB.Playlists.where('type').equals(playlist_type).toArray();
    playlists = order?.value.map((id) => playlists.find((playlist) => playlist.id === id));
    // const resultPromise = playlists.map(async (res, id) => {
    //   //const playlist = localStorage.getObject(id);
    //   const playlist = await iDB.Tracks.where('playlist').equals(id).toArray();
    //   res.push(playlist);
    //   return res;
    // }, []);
    // const result = await Promise.all(resultPromise);
    return playlists;
  }

  static async getPlaylist(url) {
    const list_id = getParameterByName('list_id', url);
    return await this.getPlaylistById(list_id);
  }

  static async getPlaylistById(list_id) {
    const playlistInfo = await iDB.Playlists.get(list_id);
    let playlist = {
      info: playlistInfo,
      tracks: []
    };
    // clear url field when load old playlist
    if (playlistInfo) {
      playlist.tracks = await iDB.Tracks.where('playlist')
        .equals(list_id)
        .toArray()
        .then((tracks) => (playlistInfo.order ? playlistInfo.order.map((id) => tracks.find((track) => track.id === id)) : tracks));
    } else {
      playlist = null;
    }
    return playlist;
  }
  static guid() {
    function s4() {
      return Math.floor((1 + Math.random()) * 0x10000)
        .toString(16)
        .substring(1);
    }
    return `${s4() + s4()}-${s4()}-${s4()}-${s4()}-${s4()}${s4()}${s4()}`;
  }

  static async reorderMyplaylist(playlist_type, playlist_id, to_playlist_id, direction) {
    await iDB.Settings.where('key')
      .equals(playlist_type + '_playlist_order')
      .modify((order) => {
        const index = order.value.findIndex((i) => i === playlist_id);
        let insertIndex = order.value.findIndex((i) => i === to_playlist_id);
        if (index === insertIndex) {
          return order;
        }
        if (insertIndex > index) {
          insertIndex -= 1;
        }
        const offset = direction === 'top' ? 0 : 1;
        arrayMove(order.value, index, insertIndex + offset);
        return order;
      });
  }

  static async saveMyplaylist(playlist_type, playlistObj) {
    const playlist = await playlistObj;

    const playlistInfo = { ...playlist.info };

    // update listid
    let playlist_id = '';
    if (playlist_type === 'my') {
      playlist_id = `myplaylist_${this.guid()}`;
      playlistInfo.id = playlist_id;
      playlistInfo.type = 'my';
      playlistInfo.order = playlist.tracks.map((track) => track.id);
      playlist.tracks.forEach((track) => (track.playlist = playlist_id));
      await iDB.transaction('rw', [iDB.Settings, iDB.Tracks, iDB.Playlists], async () => {
        await iDB.Settings.where('key')
          .equals('my_playlist_order')
          .modify((order) => order.value.push(playlist_id));
        await iDB.Playlists.put(playlistInfo);
        await iDB.Tracks.where('playlist').equals(playlist_id).delete();
        await iDB.Tracks.bulkAdd(playlist.tracks);
      });
    } else if (playlist_type === 'favorite') {
      playlist_id = playlist.info.id;
      playlistInfo.type = 'favorite';
      await iDB.Settings.where('key')
        .equals('favorite_playlist_order')
        .modify((order) => {
          if (!order.value.includes(playlist_id)) {
            order.value.push(playlist_id);
          }
        });
      await iDB.Playlists.put(playlistInfo);

      // remove all tracks info, cause favorite playlist always load latest
    }
    EventService.emit(`playlist:${playlist_type}:update`);

    return playlist_id;
  }

  static async removeMyplaylist(playlist_type, playlist_id) {
    await iDB.transaction('rw', [iDB.Settings, iDB.Tracks, iDB.Playlists], async () => {
      await iDB.Settings.where('key')
        .equals(playlist_type + '_playlist_order')
        .modify((order) => {
          if (order.value.includes(playlist_id)) order.value.splice(order.value.indexOf(playlist_id), 1);
        });
      await iDB.Playlists.where('id').equals(playlist_id).delete();
      await iDB.Tracks.where('playlist').equals(playlist_id).delete();
    });
    EventService.emit(`playlist:${playlist_type}:update`);
  }

  static async addTracksToMyplaylist(playlist_id, tracks) {
    const playlist = await iDB.Playlists.get({ id: playlist_id });
    if (!playlist) {
      return null;
    }
    // dedupe
    const filterTracks = tracks.filter((i) => !playlist.order.includes(i.id));
    playlist.order = playlist.order.concat(filterTracks.map((i) => i.id));
    filterTracks.forEach((i) => (i.playlist = playlist_id));
    await iDB.transaction('rw', [iDB.Playlists, iDB.Tracks], () => {
      // new track will always insert in beginning of playlist
      iDB.Playlists.put(playlist);
      iDB.Tracks.bulkPut(filterTracks);
    });

    EventService.emit(`playlist:id:${playlist_id}:update`);

    return playlist;
  }

  static async insertTrackToMyplaylist(playlist_id, track, to_track, direction) {
    const playlist = await iDB.Playlists.get({ id: playlist_id });
    if (playlist == null) {
      return null;
    }
    const index = playlist.order.findIndex((i) => i === track.id);
    let insertIndex = playlist.order.findIndex((i) => i === to_track.id);
    if (index === insertIndex) {
      return playlist;
    }
    if (insertIndex > index) {
      insertIndex -= 1;
    }
    const offset = direction === 'top' ? 0 : 1;
    arrayMove(playlist.order, index, insertIndex + offset);
    iDB.Playlists.put(playlist);
    return playlist;
  }

  static async removeTrackFromMyplaylist(track_id, playlist_id) {
    const playlist = await iDB.Playlists.get({ id: playlist_id });
    if (!playlist) {
      return null;
    }
    // remove from order
    playlist.order = playlist.order.filter((i) => i != track_id);
    // remove from tracks
    await iDB.transaction('rw', [iDB.Playlists, iDB.Tracks], async () => {
      await iDB.Tracks.where({ playlist: playlist_id, id: track_id }).delete();
      await iDB.Playlists.put(playlist);
    });

    EventService.emit(`playlist:id:${playlist_id}:update`);

    return playlist;
  }

  static createMyplaylist(playlist_title, tracks) {
    const playlist = {
      info: {
        cover_img_url: 'images/mycover.jpg',
        title: playlist_title,
        id: '',
        source_url: ''
      },
      tracks
    };

    // notice: create only used by my playlist, favorite created by clone interface
    this.saveMyplaylist('my', playlist);
  }

  static async editMyplaylist(playlist_id, title, cover_img_url) {
    await iDB.Playlists.where({ id: playlist_id }).modify({ title, cover_img_url });
    EventService.emit(`playlist:id:${playlist_id}:update`);
    EventService.emit(`playlist:my:update`);
  }

  static myplaylistContainers(playlist_type, list_id) {
    const key = this.getPlaylistObjectKey(playlist_type);
    if (key === '') {
      return false;
    }
    const playlist = localStorage.getObject(list_id);
    return playlist !== null && playlist.is_fav;
  }
}
