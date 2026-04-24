import { cli, Strategy } from '@jackwener/opencli/registry';
import { openQueuePanel, scrapeVisibleQueue } from './utils.js';

export const queueCommand = cli({
  site: 'neteasemusic',
  name: 'queue',
  description: 'List tracks from the currently visible NetEase Cloud Music play queue',
  domain: 'localhost',
  strategy: Strategy.UI,
  browser: true,
  args: [
    { name: 'limit', required: false, help: 'Max queue rows to read (default: 20)', default: '20' },
  ],
  columns: ['Index', 'Title', 'Artist', 'Album', 'Playing'],
  func: async (page, kwargs) => {
    const limit = parseInt(kwargs.limit, 10) || 20;
    await openQueuePanel(page);
    const rows = await scrapeVisibleQueue(page, limit);
    if (rows.length > 0) return rows;
    return [{ Index: 0, Title: 'No queue items found', Artist: '', Album: '', Playing: 'no' }];
  },
});
