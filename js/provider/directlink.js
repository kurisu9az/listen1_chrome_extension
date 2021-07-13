/**
 * 通过直链访问音乐资源 
 */
class directlink {
    
    static bootstrap_track(track, success, failure) {
        const sound = {};
        [sound.url] = track.source_url;
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