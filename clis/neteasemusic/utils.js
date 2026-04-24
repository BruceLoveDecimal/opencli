import { ArgumentError, SelectorError } from '@jackwener/opencli/errors';

export const SEARCH_TAB_LABELS = {
  song: '单曲',
  playlist: '歌单',
  album: '专辑',
  artist: '歌手',
  sound: '声音',
  podcast: '播客',
  lyric: '歌词',
  mv: 'MV',
  user: '用户',
};

const PLAYER_SELECTORS = {
  miniBar: '#page_pc_mini_bar',
  nowPlayingRoot: '#page_pc_mini_bar .TrackTitleContainer_t1s72en4, #page_pc_mini_bar [class*="TrackTitleContainer"], #page_pc_mini_bar .default-bar-wrapper',
  toggle: '#btn_pc_minibar_play, [data-log*="btn_pc_minibar_play"]',
  prev: '[data-log*="btn_pc_previous"], [title^="上一首"], [aria-label="pre"], .cmd-icon-pre',
  next: '[data-log*="btn_pc_next"], [title^="下一首"], [aria-label="next"], .cmd-icon-next',
  queueTrigger: '[title="播放列表"], [aria-label="playlist"], .cmd-icon-playlist',
  queuePanel: '#page_pc_playlist',
};

const SEARCH_GROUPS = {
  song: 'songs',
  playlist: 'playlists',
  album: 'albums',
  artist: 'artists',
  sound: 'sounds',
  podcast: 'podcasts',
  lyric: 'lyrics',
  mv: 'mvs',
  user: 'users',
};

function js(value) {
  return JSON.stringify(value);
}

export function resolveSearchMode(kwargs) {
  const active = [
    kwargs.song ? 'song' : null,
    kwargs.playlist ? 'playlist' : null,
    kwargs.album ? 'album' : null,
    kwargs.artist ? 'artist' : null,
    kwargs.sound ? 'sound' : null,
    kwargs.podcast ? 'podcast' : null,
    kwargs.lyric ? 'lyric' : null,
    kwargs.mv ? 'mv' : null,
    kwargs.user ? 'user' : null,
  ].filter(Boolean);

  if (active.length > 1) {
    throw new ArgumentError(
      'Search type flags are mutually exclusive',
      'Use at most one of --song, --playlist, --album, --artist, --sound, --podcast, --lyric, --mv, or --user.',
    );
  }

  return active[0] ?? 'all';
}

export async function setSearchQuery(page, query) {
  const found = await page.evaluate(`
    (function(q) {
      const selectors = [
        'input.cmd-input.cmd-input-default',
        'input[placeholder*="搜"]',
        'input[placeholder*="Search"]',
        'input[type="text"]'
      ];

      let input = null;
      for (const selector of selectors) {
        const candidate = document.querySelector(selector);
        if (candidate instanceof HTMLInputElement) {
          input = candidate;
          break;
        }
      }

      if (!input) return false;
      input.focus();
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
      if (!setter) return false;
      setter.call(input, q);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    })(${js(query)})
  `);

  if (!found) {
    throw new SelectorError('neteasemusic search input', 'Could not find the NetEase Cloud Music search box.');
  }

  await page.wait(0.2);
  await page.pressKey('Enter');
  await page.wait(2);
}

export async function clickSearchTab(page, label) {
  const clicked = await page.evaluate(`
    (function(label) {
      const tabs = Array.from(document.querySelectorAll('[role="tab"]'));
      const tab = tabs.find((node) => (node.textContent || '').trim() === label);
      if (!(tab instanceof HTMLElement)) return false;
      tab.click();
      return true;
    })(${js(label)})
  `);

  if (!clicked) {
    throw new SelectorError(`neteasemusic search tab: ${label}`, 'The search tab was not found after submitting the query.');
  }

  await page.wait(1.5);
}

export async function scrapeSearchResults(page, mode, limit) {
  return page.evaluate(`
    (function(mode, limit) {
      function clean(text) {
        return (text || '').replace(/\\s+/g, ' ').trim();
      }

      function linesOf(node) {
        return clean(node.innerText || node.textContent || '')
          .split(/\\n+/)
          .map((line) => clean(line))
          .filter(Boolean);
      }

      function firstText(node, selectors) {
        for (const selector of selectors) {
          const found = node.querySelector(selector);
          const text = clean(found?.textContent || '');
          if (text) return text;
        }
        return '';
      }

      function uniq(rows) {
        const seen = new Set();
        return rows.filter((row) => {
          const key = [row.Group, row.Type, row.Title, row.Subtitle, row.Meta].join('||');
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      }

      function visibleRows(selector) {
        return Array.from(document.querySelectorAll(selector)).filter((node) => {
          if (!(node instanceof HTMLElement)) return false;
          const rect = node.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        });
      }

      function pickTitle(lines) {
        return lines.find((line) => !/^\\d+$/.test(line) && !/^\\d{1,2}:\\d{2}$/.test(line)) || '';
      }

      function stripNoise(lines) {
        return lines.filter((line) => {
          return !/^(VIP|试听|原唱|MV|超清母带|沉浸声|展开歌词|复制歌词|喜欢|评分|播放全部|收藏全部)$/.test(line);
        });
      }

      function parseSongRow(node, index) {
        const rawLines = linesOf(node);
        const lines = stripNoise(rawLines);
        const duration = lines.find((line) => /^\\d{1,2}:\\d{2}$/.test(line)) || '';
        const title = firstText(node, [
          '.td-title .title',
          '.td-title .text',
          '.td-title [class*="title"]',
          '.td-title [class*="name"]',
          '.mark-text',
        ]) || pickTitle(lines.slice(1)) || pickTitle(lines);
        const artist = lines.find((line) => /\\//.test(line) || /、/.test(line)) || '';
        const albumCandidates = lines.filter((line) => {
          return line !== title
            && line !== artist
            && line !== duration
            && !/^\\d+$/.test(line)
            && !/^(万人评论|万人收藏)$/.test(line);
        });
        const album = firstText(node, [
          '.td-album .text',
          '.td-album [class*="title"]',
          '.td-album',
        ]) || albumCandidates[albumCandidates.length - 1] || '';
        return {
          Group: 'songs',
          Index: index + 1,
          Type: 'song',
          Title: title,
          Subtitle: artist,
          Meta: album || duration,
        };
      }

      function extractSongs() {
        const rows = [];
        const nodes = visibleRows('[data-log*="cell_pc_songlist_song"]');
        for (const node of nodes) {
          rows.push(parseSongRow(node, rows.length));
          if (rows.length >= limit) break;
        }
        return uniq(rows);
      }

      function extractPlaylists() {
        const rows = [];
        const nodes = visibleRows('[data-log*="cell_pc_common_playlist"]');
        for (const node of nodes) {
          if (!(node instanceof HTMLElement)) continue;
          const lines = linesOf(node).filter((line) => !/^\\d+$/.test(line));
          const title = firstText(node, [
            '.td-title .title',
            '.td-title .text',
            '.td-title [class*="title"]',
            '.td-title [class*="name"]',
          ]) || pickTitle(lines);
          const trackCount = lines.find((line) => /首$/.test(line)) || '';
          const playCount = lines.find((line) => /万|亿|^\\d+$/.test(line) && !/首$/.test(line)) || '';
          const creator = lines.find((line) => line !== title && line !== trackCount && line !== playCount) || '';
          rows.push({
            Group: 'playlists',
            Index: rows.length + 1,
            Type: 'playlist',
            Title: title,
            Subtitle: creator,
            Meta: [trackCount, playCount].filter(Boolean).join(' / '),
          });
          if (rows.length >= limit) break;
        }
        return uniq(rows);
      }

      function extractAlbums() {
        const rows = [];
        const nodes = visibleRows('[data-log*="cell_pc_albumlist_album"]');
        for (const node of nodes) {
          const lines = linesOf(node).filter((line) => !/^\\d+$/.test(line));
          const title = firstText(node, [
            '.td-title .title',
            '.td-title .text',
            '.td-title [class*="title"]',
            '.td-title [class*="name"]',
          ]) || pickTitle(lines);
          const date = lines.find((line) => /^\\d{4}-\\d{2}-\\d{2}$/.test(line)) || '';
          const author = lines.find((line) => line !== title && line !== date) || '';
          rows.push({
            Group: 'albums',
            Index: rows.length + 1,
            Type: 'album',
            Title: title,
            Subtitle: author,
            Meta: date,
          });
          if (rows.length >= limit) break;
        }
        return uniq(rows);
      }

      function extractArtists() {
        const rows = [];
        const nodes = visibleRows('[data-log*="cell_pc_common_artist"]');
        for (const node of nodes) {
          if (!(node instanceof HTMLElement)) continue;
          const lines = linesOf(node);
          const title = firstText(node, ['.name', '.title', '[class*="name"]', '[class*="title"]']) || pickTitle(lines);
          const meta = lines.find((line) => /^专辑：/.test(line)) || lines.find((line) => line !== title) || '';
          rows.push({
            Group: 'artists',
            Index: rows.length + 1,
            Type: 'artist',
            Title: title,
            Subtitle: '',
            Meta: meta,
          });
          if (rows.length >= limit) break;
        }
        return uniq(rows);
      }

      function extractPodcastRows() {
        const rows = [];
        const nodes = visibleRows('[data-log*="page_pc_search_voicelist"] .tr[data-index]');
        for (const node of nodes) {
          if (!(node instanceof HTMLElement)) continue;
          const lines = linesOf(node).filter((line) => !/^\\d+$/.test(line));
          const title = firstText(node, [
            '.td-title .title',
            '.td-title .text',
            '.td-title [class*="title"]',
            '.td-title [class*="name"]',
          ]) || pickTitle(lines);
          const creator = lines[1] || '';
          const count = lines.find((line) => /个$/.test(line)) || '';
          const playCount = lines.find((line) => /万|亿|^\\d+$/.test(line) && !/个$/.test(line)) || '';
          const rating = lines.find((line) => /^\\d(?:\\.\\d+)?分?$/.test(line)) || '';
          rows.push({
            Group: 'podcasts',
            Index: rows.length + 1,
            Type: 'podcast',
            Title: title,
            Subtitle: creator,
            Meta: [count, playCount, rating].filter(Boolean).join(' / '),
          });
          if (rows.length >= limit) break;
        }
        return uniq(rows);
      }

      function extractLyricRows() {
        const rows = [];
        const nodes = visibleRows('[data-log*="cell_pc_search_lyric"]');
        for (const node of nodes) {
          if (!(node instanceof HTMLElement)) continue;
          const lines = stripNoise(linesOf(node)).filter((line) => !/^\\d+$/.test(line));
          const title = firstText(node, [
            '.td-title .title',
            '.td-title .text',
            '.td-title [class*="title"]',
            '.td-title [class*="name"]',
          ]) || pickTitle(lines);
          const duration = lines.find((line) => /^\\d{1,2}:\\d{2}$/.test(line)) || '';
          const artist = lines.find((line) => /\\//.test(line) || /周杰伦|蔡依林|李荣浩|吴宗宪|温岚/.test(line)) || '';
          const lyricLines = lines.filter((line) => {
            return line !== title
              && line !== artist
              && line !== duration
              && !/^(VIP|试听|原唱|MV|超清母带|沉浸声)$/.test(line)
              && !/^\\d+$/.test(line);
          });
          const snippet = lyricLines.slice(-3).join(' / ');
          rows.push({
            Group: 'lyrics',
            Index: rows.length + 1,
            Type: 'lyric',
            Title: title,
            Subtitle: artist,
            Meta: snippet,
          });
          if (rows.length >= limit) break;
        }
        return uniq(rows);
      }

      function extractGenericVisibleRows(type, group) {
        const rows = [];
        const nodes = visibleRows('[data-index], [data-log]');
        for (const node of nodes) {
          if (!(node instanceof HTMLElement)) continue;
          const lines = stripNoise(linesOf(node)).filter((line) => !/^\\d+$/.test(line));
          if (lines.length < 2) continue;
          const title = firstText(node, [
            '.td-title .title',
            '.td-title .text',
            '.td-title [class*="title"]',
            '.td-title [class*="name"]',
            '.name',
            '.title',
          ]) || pickTitle(lines);
          if (!title) continue;
          const subtitle = lines.find((line) => line !== title) || '';
          const meta = lines.filter((line) => line !== title && line !== subtitle).slice(0, 2).join(' / ');
          rows.push({
            Group: group,
            Index: rows.length + 1,
            Type: type,
            Title: title,
            Subtitle: subtitle,
            Meta: meta,
          });
          if (rows.length >= limit) break;
        }
        return uniq(rows);
      }

      const grouped = {
        songs: extractSongs(),
        playlists: extractPlaylists(),
        albums: extractAlbums(),
        artists: extractArtists(),
      };

      const singleModeResult = mode === 'song'
        ? grouped.songs
        : mode === 'playlist'
          ? grouped.playlists
          : mode === 'album'
            ? grouped.albums
            : mode === 'artist'
              ? grouped.artists
              : mode === 'podcast'
                ? extractPodcastRows()
                : mode === 'lyric'
                  ? extractLyricRows()
                  : extractGenericVisibleRows(mode, ${js(SEARCH_GROUPS)}[mode] || mode);

      const result = mode === 'all'
        ? [...grouped.songs, ...grouped.playlists, ...grouped.albums, ...grouped.artists]
        : singleModeResult;

      const deduped = uniq(result).slice(0, mode === 'all' ? limit * 4 : limit);
      if (deduped.length > 0) return deduped;

      return [{
        Group: mode === 'all' ? 'none' : ${js(SEARCH_GROUPS)}[mode] || mode,
        Index: 0,
        Type: mode === 'all' ? 'none' : mode,
        Title: 'No results found',
        Subtitle: '',
        Meta: '',
      }];
    })(${js(mode)}, ${Number(limit) || 5})
  `);
}

export async function scrapeNowPlaying(page) {
  return page.evaluate(`
    (function() {
      function clean(text) {
        return (text || '').replace(/\\s+/g, ' ').trim();
      }

      function textFrom(selectors) {
        for (const selector of selectors) {
          const node = document.querySelector(selector);
          if (!(node instanceof HTMLElement)) continue;
          const title = clean(node.getAttribute('title') || '');
          if (title) return title;
          const text = clean(node.textContent || '');
          if (text) return text;
        }
        return '';
      }

      function queryFirst(selectors, scope) {
        for (const selector of selectors) {
          const node = scope.querySelector(selector);
          if (node) return node;
        }
        return null;
      }

      function parseDataLog(value) {
        if (!value) return null;
        try {
          return JSON.parse(value);
        } catch {
          return null;
        }
      }

      const miniBar = document.querySelector(${js(PLAYER_SELECTORS.miniBar)});
      if (!(miniBar instanceof HTMLElement)) {
        return {
          Status: 'stopped',
          Title: '',
          Artist: '',
          Album: '',
          Position: '00:00',
          Duration: '00:00',
        };
      }

      const toggleButton = miniBar.querySelector(${js(PLAYER_SELECTORS.toggle)});
      const toggleLog = toggleButton instanceof HTMLElement ? parseDataLog(toggleButton.getAttribute('data-log') || '') : null;
      const toggleType = toggleLog?.params?.type || '';

      const title = textFrom([
        '#page_pc_mini_bar .TrackTitleContainer_t1s72en4 .title[title]',
        '#page_pc_mini_bar [class*="TrackTitleContainer"] .title[title]',
        '#page_pc_mini_bar .TrackTitleContainer_t1s72en4 .title',
        '#page_pc_mini_bar [class*="TrackTitleContainer"] .title',
        '#page_pc_mini_bar .default-bar-wrapper .main-title',
        '#page_pc_mini_bar .default-bar-wrapper .title-container',
      ]);
      const artist = textFrom([
        '#page_pc_mini_bar .TrackTitleContainer_t1s72en4 .info.artist [title]',
        '#page_pc_mini_bar [class*="TrackTitleContainer"] .info.artist [title]',
        '#page_pc_mini_bar .TrackTitleContainer_t1s72en4 .info.artist',
        '#page_pc_mini_bar [class*="TrackTitleContainer"] .info.artist',
        '#page_pc_mini_bar .default-bar-wrapper .author',
      ]).replace(/\\s*\\/\\s*/g, ' / ');
      const album = textFrom([
        '#page_pc_mini_bar .TrackTitleContainer_t1s72en4 .info.album [title]',
        '#page_pc_mini_bar [class*="TrackTitleContainer"] .info.album [title]',
        '#page_pc_mini_bar .TrackTitleContainer_t1s72en4 .info.album .link',
        '#page_pc_mini_bar [class*="TrackTitleContainer"] .info.album .link',
      ]);

      const slider = queryFirst([
        '.slider-default[aria-label*="播放进度"]',
        '.slider-default[aria-label*="progress"]',
      ], miniBar);
      const timeSource = clean([
        slider instanceof HTMLElement ? slider.textContent || '' : '',
        miniBar.textContent || '',
      ].join(' '));
      const timeMatch = timeSource.match(/(\\d{1,2}:\\d{2})\\s*\\/\\s*(\\d{1,2}:\\d{2})/);
      const position = timeMatch?.[1] || '00:00';
      const duration = timeMatch?.[2] || '00:00';

      const status = toggleType === 'pause'
        ? 'playing'
        : toggleType === 'play'
          ? (title ? 'paused' : 'stopped')
          : (title ? 'unknown' : 'stopped');

      return {
        Status: status,
        Title: title,
        Artist: artist === '未知' ? '' : artist,
        Album: album === '未知' ? '' : album,
        Position: position,
        Duration: duration,
      };
    })()
  `);
}

export async function clickPlayerControl(page, kind) {
  const selectors = {
    toggle: PLAYER_SELECTORS.toggle,
    next: PLAYER_SELECTORS.next,
    prev: PLAYER_SELECTORS.prev,
  };

  const clicked = await page.evaluate(`
    (function(selector) {
      const node = document.querySelector(selector);
      const target = node instanceof HTMLElement ? (node.closest('button, [role="button"]') || node) : null;
      if (!(target instanceof HTMLElement)) return false;
      target.click();
      return true;
    })(${js(selectors[kind])})
  `);

  if (!clicked) {
    throw new SelectorError(`neteasemusic player control: ${kind}`, 'Could not find the requested player control in the bottom player bar.');
  }

  await page.wait(0.5);
}

export async function scrapeVisibleQueue(page, limit) {
  return page.evaluate(`
    (function(limit) {
      function clean(text) {
        return (text || '').replace(/\\s+/g, ' ').trim();
      }

      function textFrom(selectors, scope) {
        for (const selector of selectors) {
          const node = scope.querySelector(selector);
          if (!(node instanceof HTMLElement)) continue;
          const title = clean(node.getAttribute('title') || '');
          if (title) return title;
          const text = clean(node.textContent || '');
          if (text) return text;
        }
        return '';
      }

      function parseDataLog(value) {
        if (!value) return null;
        try {
          return JSON.parse(value);
        } catch {
          return null;
        }
      }

      const scope = document.querySelector(${js(PLAYER_SELECTORS.queuePanel)});
      if (!(scope instanceof HTMLElement)) return [];

      const rows = [];
      const items = scope.querySelectorAll('[data-log*="cell_pc_songlist_song"]');
      for (const item of items) {
        if (!(item instanceof HTMLElement)) continue;
        const log = parseDataLog(item.getAttribute('data-log') || '');
        const title = textFrom([
          '.playinglist-container h4.title[title]',
          '.playinglist-container .title[title]',
          '.playinglist-container h4.title',
          '.playinglist-container .title',
          '.td-title .title[title]',
          '.td-title .title',
        ], item);
        const artist = textFrom([
          '.playinglist-container h5.artists[title]',
          '.playinglist-container .artists[title]',
          '.playinglist-container h5.artists',
          '.playinglist-container .artists',
          '.td-title .artists[title]',
          '.td-title .artists',
        ], item).replace(/\\s*\\/\\s*/g, ' / ');
        const album = textFrom([
          '.td-album [title]',
          '.td-album .text',
          '.td-album',
        ], item);
        if (!title) continue;
        rows.push({
          Index: rows.length + 1,
          Title: title,
          Artist: artist,
          Album: album,
          Playing: log?.params?.s_isplay ? 'yes' : (item.querySelector('.title-playing, .sub-title-playing') ? 'yes' : 'no'),
        });
        if (rows.length >= limit) break;
      }

      return rows;
    })(${Number(limit) || 20})
  `);
}

export async function openQueuePanel(page) {
  const alreadyOpen = await page.evaluate(`
    (function(selector) {
      const panel = document.querySelector(selector);
      return panel instanceof HTMLElement;
    })(${js(PLAYER_SELECTORS.queuePanel)})
  `);

  if (alreadyOpen) return;

  const direct = await page.evaluate(`
    (function(selector) {
      const node = document.querySelector(selector);
      const target = node instanceof HTMLElement ? (node.closest('button, [role="button"]') || node) : null;
      if (target instanceof HTMLElement) {
        target.click();
        return true;
      }
      return false;
    })(${js(PLAYER_SELECTORS.queueTrigger)})
  `);

  if (!direct) {
    throw new SelectorError('neteasemusic queue trigger', 'Could not find a queue or playlist trigger in the bottom player area.');
  }

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const open = await page.evaluate(`
      (function(selector) {
        const panel = document.querySelector(selector);
        return panel instanceof HTMLElement;
      })(${js(PLAYER_SELECTORS.queuePanel)})
    `);
    if (open) return;
    await page.wait(0.2);
  }

  throw new SelectorError('neteasemusic queue panel', 'Clicked the playlist trigger, but the play queue panel did not appear.');
}

export async function waitForPlayerUpdate(page, kind, previous) {
  let latest = previous;
  for (let attempt = 0; attempt < 12; attempt += 1) {
    await page.wait(0.25);
    latest = await scrapeNowPlaying(page);
    if (kind === 'toggle') {
      if (latest.Status !== previous.Status || latest.Title !== previous.Title) return latest;
      continue;
    }

    if (latest.Title && (latest.Title !== previous.Title || latest.Artist !== previous.Artist)) {
      return latest;
    }
  }

  return latest;
}
