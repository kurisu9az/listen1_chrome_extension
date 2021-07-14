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
        default:
          return null;
      }
    }

    static dl_get_playlist(url) {
      const playlist_url = getParameterByName('list_id', url).split('dlplaylist_').pop();
      return {
        success: (fn) => {
          axios.get(playlist_url).then((response) => {
            const { data } = response.data;
            const info = {
              cover_img_url: data.cover,
              title: data.title,
              id: `dlplaylist_${playlist_url}`,
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

    static dl_convert_song(song_info) {
      const track = {
        id: `dltrack_${song_info.id}`,
        title: song_info.title,
        artist: song_info.artist,
        artist_id: `dlartist_${song_info.artist_id}`,
        album: song_info.album,
        album_id: song_info.album_id,
        source: 'directlink',
        source_url: song_info.source_url,
        img_url: song_info.cover,
        lyric_url: song_info.lyric_url,
      };
      return track;
    }

    static bootstrap_track(track, success, failure) {
        const sound = {};
        sound.url = track.source_url;
        sound.platform = 'directlink';
    
        success(sound);
    }

    static lyric(url) {
        // const track_id = getParameterByName('track_id', url).split('_').pop();
        const lyric_url = getParameterByName('lyric_url', url);
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