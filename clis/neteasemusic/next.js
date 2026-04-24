import { cli, Strategy } from '@jackwener/opencli/registry';
import { clickPlayerControl, scrapeNowPlaying, waitForPlayerUpdate } from './utils.js';

export const nextCommand = cli({
  site: 'neteasemusic',
  name: 'next',
  description: 'Skip to the next track in NetEase Cloud Music',
  domain: 'localhost',
  strategy: Strategy.UI,
  browser: true,
  args: [],
  columns: ['Action', 'Title', 'Artist'],
  func: async (page) => {
    const previous = await scrapeNowPlaying(page);
    await clickPlayerControl(page, 'next');
    const current = await waitForPlayerUpdate(page, 'next', previous);
    return [{
      Action: 'next',
      Title: current.Title,
      Artist: current.Artist,
    }];
  },
});
