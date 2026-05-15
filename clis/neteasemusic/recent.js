import { cli, Strategy } from '@jackwener/opencli/registry';
import { navigateLibrarySection, noRows, scrapeRecentSongs } from './utils.js';

export const recentCommand = cli({
  site: 'neteasemusic',
  name: 'recent',
  description: 'List songs from the "Recently Played" page in NetEase Cloud Music',
  domain: 'localhost',
  strategy: Strategy.UI,
  browser: true,
  args: [
    { name: 'limit', required: false, help: 'Max recent songs to read (default: 20)', default: '20' },
  ],
  columns: ['Index', 'Title', 'Artist', 'Album', 'PlayedAt'],
  func: async (page, kwargs) => {
    const limit = parseInt(kwargs.limit, 10) || 20;
    await navigateLibrarySection(page, 'recent');
    const rows = await scrapeRecentSongs(page, limit);
    return rows.length > 0 ? rows : noRows(['Index', 'Title', 'Artist', 'Album', 'PlayedAt'], 'No recent songs found');
  },
});
