/**
 * 通过自定义服务器访问音乐资源 
 */
 import axios from 'axios';
 import { getParameterByName } from './lowebutil';
 import MusicResource from './music_resource';

 const TRACK_ID_PREFIX = "cstrack"
 const PLATLIST_PREFIX = "csplaylist"
 const ALBUM_PREFIX = "csalbum"
 const ARTIST_PREFIX = "csartist"
 const SOURCE = "customsource"

 export default class customsource extends MusicResource {
    
    static async parseUrl(url) {
      let result;
      const match = /^custom:/.exec(url);
      if (match != null) {
        const playlist_url = url.slice(3)
        result = {
          type: 'playlist',
          id: `${PLATLIST_PREFIX}_${playlist_url}`,
        };
      }
      return result;
    }

    static getPlaylist(url) {
      const list_id = getParameterByName('list_id', url).split('_')[0];
      switch (list_id) {
        case PLATLIST_PREFIX:
          return this.get_playlist(url);
        case ALBUM_PREFIX:
          return this.get_album(url);
        case ARTIST_PREFIX:
          return this.get_artist(url);
        default:
          return null;
      }
    }

    static get_playlist(url) {
      return this.loadResult(url, `${PLATLIST_PREFIX}_`);
    }
    
    static get_album(url) {
      return this.loadResult(url, `${ALBUM_PREFIX}_`);
    }

    static get_artist(url) {
      return this.loadResult(url, `${ARTIST_PREFIX}_`);
    }

    static convert_song(song_info) {
      const track = {
        id: `${TRACK_ID_PREFIX}_${song_info.id}`,
        title: song_info.title,
        artist: song_info.artist,
        artist_id: `${ARTIST_PREFIX}_${song_info.artist_url}`,
        album: song_info.album,
        album_id: `${ALBUM_PREFIX}_${song_info.album_url}`,
        source: SOURCE,
        source_url: song_info.source_url,
        img_url: song_info.cover,
        lyric_url: song_info.lyric_url,
      };
      return track;
    }

    static async loadResult(url, prefix) {
      const playlist_url = getParameterByName('list_id', url).split(prefix).pop();

      if (playlist_url == undefined || playlist_url == null) {
        return {
          info: {},
          tracks: []
        }
      }

      const getResultInfo = async () => {
        const { data } = (await axios.get(playlist_url)).data;
        const info = {
          cover_img_url: data.cover,
          title: data.title,
          id: `${prefix}${playlist_url}`,
          source_url: `${playlist_url}`,
        };
        const tracks = data.tracks.map((item) => this.convert_song(item));

        return {
          info,
          tracks,
        };
      };

      return await getResultInfo();
    }



    static bootstrap_track(track, success, failure) {
        const sound = {};
        sound.url = track.source_url;
        sound.platform = SOURCE;
    
        success(sound);
    }

    static lyric(url) {
        const lyric_url = getParameterByName('lyric_url', url);
        if (lyric_url == undefined || lyric_url == null) {
          return {
            success: (fn) => 
              fn({
                lyric: "",
              })
          }
        }
        
        return {
          success: (fn) => {
            axios.get(lyric_url).then((response) => {
              const { data } = response;
              return fn({
                lyric: data,
              });
            });
          },
        };
      }
}