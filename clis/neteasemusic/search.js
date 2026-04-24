import { cli, Strategy } from '@jackwener/opencli/registry';
import { SEARCH_TAB_LABELS, clickSearchTab, resolveSearchMode, scrapeSearchResults, setSearchQuery } from './utils.js';

export const searchCommand = cli({
  site: 'neteasemusic',
  name: 'search',
  description: 'Search NetEase Cloud Music across songs, playlists, albums, and artists',
  domain: 'localhost',
  strategy: Strategy.UI,
  browser: true,
  args: [
    { name: 'query', required: true, positional: true, help: 'Search query' },
    { name: 'song', help: 'Only return song results' },
    { name: 'playlist', help: 'Only return playlist results' },
    { name: 'album', help: 'Only return album results' },
    { name: 'artist', help: 'Only return artist results' },
    { name: 'sound', help: 'Only return sound results' },
    { name: 'podcast', help: 'Only return podcast results' },
    { name: 'lyric', help: 'Only return lyric search results' },
    { name: 'mv', help: 'Only return MV results' },
    { name: 'user', help: 'Only return user results' },
    { name: 'all', help: 'Explicitly request comprehensive search results' },
    { name: 'limit', required: false, help: 'Max rows per result group (default: 5)', default: '5' },
  ],
  columns: ['Group', 'Index', 'Type', 'Title', 'Subtitle', 'Meta'],
  func: async (page, kwargs) => {
    const query = kwargs.query;
    const limit = parseInt(kwargs.limit, 10) || 5;
    const mode = kwargs.all ? 'all' : resolveSearchMode(kwargs);

    await setSearchQuery(page, query);
    if (mode !== 'all') {
      await clickSearchTab(page, SEARCH_TAB_LABELS[mode]);
    }

    return scrapeSearchResults(page, mode, limit);
  },
});
