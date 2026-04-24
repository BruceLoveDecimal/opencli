import { cli, Strategy } from '@jackwener/opencli/registry';
import { scrapeNowPlaying } from './utils.js';

export const nowPlayingCommand = cli({
  site: 'neteasemusic',
  name: 'now-playing',
  description: 'Read the current song from the NetEase Cloud Music player bar',
  domain: 'localhost',
  strategy: Strategy.UI,
  browser: true,
  args: [],
  columns: ['Status', 'Title', 'Artist', 'Album', 'Position', 'Duration'],
  func: async (page) => {
    const current = await scrapeNowPlaying(page);
    return [current];
  },
});
