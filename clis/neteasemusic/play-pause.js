import { cli, Strategy } from '@jackwener/opencli/registry';
import { clickPlayerControl, scrapeNowPlaying, waitForPlayerUpdate } from './utils.js';

export const playPauseCommand = cli({
  site: 'neteasemusic',
  name: 'play-pause',
  description: 'Toggle play or pause from the bottom NetEase Cloud Music player bar',
  domain: 'localhost',
  strategy: Strategy.UI,
  browser: true,
  args: [],
  columns: ['Action', 'Status', 'Title'],
  func: async (page) => {
    const previous = await scrapeNowPlaying(page);
    await clickPlayerControl(page, 'toggle');
    const current = await waitForPlayerUpdate(page, 'toggle', previous);
    return [{
      Action: 'toggle',
      Status: current.Status,
      Title: current.Title,
    }];
  },
});
