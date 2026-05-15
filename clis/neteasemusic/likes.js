import { cli, Strategy } from '@jackwener/opencli/registry';
import { navigateLibrarySection, noRows, scrapeLikedSongs } from './utils.js';

export const likesCommand = cli({
  site: 'neteasemusic',
  name: 'likes',
  description: 'List songs from the "Liked Songs" page in NetEase Cloud Music',
  domain: 'localhost',
  strategy: Strategy.UI,
  browser: true,
  args: [
    { name: 'limit', required: false, help: 'Max liked songs to read (default: 20)', default: '20' },
  ],
  columns: ['Index', 'Title', 'Artist', 'Album', 'Duration'],
  func: async (page, kwargs) => {
    const limit = parseInt(kwargs.limit, 10) || 20;
    await navigateLibrarySection(page, 'likes');
    const rows = await scrapeLikedSongs(page, limit);
    return rows.length > 0 ? rows : noRows(['Index', 'Title', 'Artist', 'Album', 'Duration'], 'No liked songs found');
  },
});
