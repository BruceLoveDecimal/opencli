import { describe, expect, it, vi } from 'vitest';
import { SelectorError } from '@jackwener/opencli/errors';
import {
  navigateHome,
  navigateLibrarySection,
  scrapeLikedSongs,
  scrapeRecentSongs,
  scrapeFavoriteItems,
  scrapeOfficialPlaylists,
  scrapeLatestMusic,
  noRows,
} from './utils.js';

function makePage(evaluateResponses = []) {
  const queue = [...evaluateResponses];
  return {
    evaluate: vi.fn(async () => {
      if (queue.length === 0) throw new Error('Unexpected evaluate() call');
      return queue.shift();
    }),
    wait: vi.fn(async () => {}),
  };
}

describe('neteasemusic library helpers', () => {
  it('navigateLibrarySection clicks and waits for likes page', async () => {
    const page = makePage([undefined, true, true]);
    await navigateLibrarySection(page, 'likes');
    expect(page.evaluate).toHaveBeenCalledTimes(3);
    expect(page.wait).toHaveBeenCalled();
  });

  it('navigateHome clicks and waits for the homepage modules', async () => {
    const page = makePage([undefined, true, true]);
    await navigateHome(page);
    expect(page.evaluate).toHaveBeenCalledTimes(3);
  });

  it('navigateLibrarySection throws when the sidebar entry is missing', async () => {
    const page = makePage([undefined, false]);
    await expect(navigateLibrarySection(page, 'favorites')).rejects.toBeInstanceOf(SelectorError);
  });

  it('scrapeLikedSongs returns rows produced by the page evaluator', async () => {
    const rows = [{ Index: 1, Title: 'Song A', Artist: 'Artist A', Album: 'Album A', Duration: '03:21' }];
    const page = makePage([rows]);
    await expect(scrapeLikedSongs(page, 5)).resolves.toEqual(rows);
  });

  it('scrapeRecentSongs returns rows produced by the page evaluator', async () => {
    const rows = [{ Index: 1, Title: 'Song B', Artist: 'Artist B', Album: 'Album B', PlayedAt: '1小时前' }];
    const page = makePage([rows]);
    await expect(scrapeRecentSongs(page, 5)).resolves.toEqual(rows);
  });

  it('scrapeFavoriteItems returns rows produced by the page evaluator', async () => {
    const rows = [{ Index: 1, Type: 'playlist', Title: 'My List', Subtitle: 'me', Meta: '' }];
    const page = makePage([rows]);
    await expect(scrapeFavoriteItems(page, 5)).resolves.toEqual(rows);
  });

  it('scrapeOfficialPlaylists returns rows produced by the page evaluator', async () => {
    const rows = [{ Index: 1, Title: 'Official A', Subtitle: 'desc', PlayCount: '100万', PlaylistId: '123' }];
    const page = makePage([rows]);
    await expect(scrapeOfficialPlaylists(page, 5)).resolves.toEqual(rows);
  });

  it('scrapeLatestMusic returns rows produced by the page evaluator', async () => {
    const rows = [{ Index: 1, Title: 'Latest A', Artist: 'Artist A', Meta: 'Hi-Res / 原唱' }];
    const page = makePage([rows]);
    await expect(scrapeLatestMusic(page, 5)).resolves.toEqual(rows);
  });

  it('noRows builds an empty-result row for arbitrary columns', () => {
    expect(noRows(['Index', 'Title', 'Artist', 'Album'], 'Nothing here')).toEqual([
      { Index: 0, Title: 'Nothing here', Artist: '', Album: '' },
    ]);
  });
});
