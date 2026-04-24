# NetEase Cloud Music

Control the **NetEase Cloud Music Desktop App** from the terminal via Chrome DevTools Protocol (CDP). The macOS desktop app is CEF-based and exposes a working remote debugging endpoint when launched with a debug port.

## Prerequisites

Launch with remote debugging port:

```bash
/Applications/NeteaseMusic.app/Contents/MacOS/NeteaseMusic --remote-debugging-port=9238
```

## Setup

```bash
export OPENCLI_CDP_ENDPOINT="http://127.0.0.1:9238"
```

## Commands

| Command | Description |
|---------|-------------|
| `opencli neteasemusic status` | Check CDP connection |
| `opencli neteasemusic dump` | Dump DOM and accessibility tree into `/tmp` |
| `opencli neteasemusic screenshot` | Save DOM and accessibility snapshot artifacts |
| `opencli neteasemusic now-playing` | Read the current song from the player bar |
| `opencli neteasemusic play-pause` | Toggle playback |
| `opencli neteasemusic next` | Skip to the next track |
| `opencli neteasemusic prev` | Return to the previous track |
| `opencli neteasemusic search "周杰伦"` | Search songs, playlists, albums, and artists |
| `opencli neteasemusic search "周杰伦" --song` | Restrict search to songs |
| `opencli neteasemusic search "周杰伦" --playlist` | Restrict search to playlists |
| `opencli neteasemusic search "周杰伦" --artist` | Restrict search to artists |
| `opencli neteasemusic search "周杰伦" --album` | Restrict search to albums |
| `opencli neteasemusic search "周杰伦" --sound` | Restrict search to sounds |
| `opencli neteasemusic search "周杰伦" --podcast` | Restrict search to podcasts |
| `opencli neteasemusic search "周杰伦" --lyric` | Restrict search to lyric results |
| `opencli neteasemusic search "周杰伦" --mv` | Restrict search to MVs |
| `opencli neteasemusic search "周杰伦" --user` | Restrict search to users |
| `opencli neteasemusic queue` | Read the currently visible play queue |

## Notes

- V1 targets the macOS desktop app first.
- Search defaults to the comprehensive result view.
- Queue and playback selectors are based on the current CEF desktop UI and may need adjustment if NetEase changes the player shell.
