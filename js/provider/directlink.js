/**
 * 通过直链访问音乐资源 
 */
class directlink {
    
    static parse_url(url) {
      let result;
      const match = /^dl:/.exec(url);
      if (match != null) {
        const playlist_url = url.slice(3)
        result = {
          type: 'playlist',
          id: `dlplaylist_${playlist_url}`,
        };
      }
      return {
        success: (fn) => {
          fn(result);
        },
      };
    }

    static get_playlist(url) {
      const list_id = getParameterByName('list_id', url).split('_')[0];
      switch (list_id) {
        case 'dlplaylist':
          return this.dl_get_playlist(url);
        case 'dlalbum':
          return this.dl_album(url);
        case 'dlartist':
          return this.dl_artist(url);
        default:
          return null;
      }
    }

    static dl_get_playlist(url) {
      return this.loadResult(url, 'dlplaylist_');
    }
    
    static dl_album(url) {
      return this.loadResult(url, 'dlalbum_');
    }

    static dl_artist(url) {
      return this.loadResult(url, 'dlartist_');
    }

    static dl_convert_song(song_info) {
      const track = {
        id: `dltrack_${song_info.id}`,
        title: song_info.title,
        artist: song_info.artist,
        artist_id: `dlartist_${song_info.artist_url}`,
        album: song_info.album,
        album_id: `dlalbum_${song_info.album_url}`,
        source: 'directlink',
        source_url: song_info.source_url,
        img_url: song_info.cover,
        lyric_url: song_info.lyric_url,
      };
      return track;
    }

    static loadResult(url, prefix) {
      const playlist_url = getParameterByName('list_id', url).split(prefix).pop();

      if (playlist_url == undefined || playlist_url == null) {
        return {
          success: (fn) => 
            fn({
              info: {},
              tracks: [],
            })
        }
      }

      return {
        success: (fn) => {
          axios.get(playlist_url).then((response) => {
            const { data } = response.data;
            const info = {
              cover_img_url: data.cover,
              title: data.title,
              id: `${prefix}${playlist_url}`,
              source_url: `${playlist_url}`,
            };
            const tracks = data.tracks.map((item) => this.dl_convert_song(item));
            return fn({
              info,
              tracks,
            });
          });
        },
      };
    }



    static bootstrap_track(track, success, failure) {
        const sound = {};
        sound.url = track.source_url;
        sound.platform = 'directlink';
    
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