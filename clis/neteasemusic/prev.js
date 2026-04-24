import { cli, Strategy } from '@jackwener/opencli/registry';
import { clickPlayerControl, scrapeNowPlaying, waitForPlayerUpdate } from './utils.js';

export const prevCommand = cli({
  site: 'neteasemusic',
  name: 'prev',
  description: 'Return to the previous track in NetEase Cloud Music',
  domain: 'localhost',
  strategy: Strategy.UI,
  browser: true,
  args: [],
  columns: ['Action', 'Title', 'Artist'],
  func: async (page) => {
    const previous = await scrapeNowPlaying(page);
    await clickPlayerControl(page, 'prev');
    const current = await waitForPlayerUpdate(page, 'prev', previous);
    return [{
      Action: 'prev',
      Title: current.Title,
      Artist: current.Artist,
    }];
  },
});
