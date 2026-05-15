import { cli, Strategy } from '@jackwener/opencli/registry';
import { navigateLibrarySection, noRows, scrapeFavoriteItems } from './utils.js';

export const favoritesCommand = cli({
  site: 'neteasemusic',
  name: 'favorites',
  description: 'List visible items from the "Favorites" page in NetEase Cloud Music',
  domain: 'localhost',
  strategy: Strategy.UI,
  browser: true,
  args: [
    { name: 'limit', required: false, help: 'Max favorite items to read (default: 20)', default: '20' },
  ],
  columns: ['Index', 'Type', 'Title', 'Subtitle', 'Meta'],
  func: async (page, kwargs) => {
    const limit = parseInt(kwargs.limit, 10) || 20;
    await navigateLibrarySection(page, 'favorites');
    const rows = await scrapeFavoriteItems(page, limit);
    return rows.length > 0 ? rows : noRows(['Index', 'Type', 'Title', 'Subtitle', 'Meta'], 'No favorite items found');
  },
});
