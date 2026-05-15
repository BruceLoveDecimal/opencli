import { cli, Strategy } from '@jackwener/opencli/registry';
import { navigateHome, noRows, scrapeLatestMusic } from './utils.js';

export const latestMusicCommand = cli({
  site: 'neteasemusic',
  name: 'latest-music',
  description: 'List visible cards from the "Latest Music" module on the NetEase Cloud Music home page',
  domain: 'localhost',
  strategy: Strategy.UI,
  browser: true,
  args: [
    { name: 'limit', required: false, help: 'Max latest songs to read (default: 20)', default: '20' },
  ],
  columns: ['Index', 'Title', 'Artist', 'Meta'],
  func: async (page, kwargs) => {
    const limit = parseInt(kwargs.limit, 10) || 20;
    await navigateHome(page);
    const rows = await scrapeLatestMusic(page, limit);
    return rows.length > 0
      ? rows
      : noRows(['Index', 'Title', 'Artist', 'Meta'], 'No latest songs found');
  },
});
