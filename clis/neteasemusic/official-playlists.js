import { cli, Strategy } from '@jackwener/opencli/registry';
import { navigateHome, noRows, scrapeOfficialPlaylists } from './utils.js';

export const officialPlaylistsCommand = cli({
  site: 'neteasemusic',
  name: 'official-playlists',
  description: 'List visible cards from the "Official Playlists" module on the NetEase Cloud Music home page',
  domain: 'localhost',
  strategy: Strategy.UI,
  browser: true,
  args: [
    { name: 'limit', required: false, help: 'Max official playlists to read (default: 20)', default: '20' },
  ],
  columns: ['Index', 'Title', 'Subtitle', 'PlayCount', 'PlaylistId'],
  func: async (page, kwargs) => {
    const limit = parseInt(kwargs.limit, 10) || 20;
    await navigateHome(page);
    const rows = await scrapeOfficialPlaylists(page, limit);
    return rows.length > 0
      ? rows
      : noRows(['Index', 'Title', 'Subtitle', 'PlayCount', 'PlaylistId'], 'No official playlists found');
  },
});
