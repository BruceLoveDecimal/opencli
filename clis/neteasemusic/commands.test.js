import { describe, expect, it } from 'vitest';
import { likesCommand } from './likes.js';
import { recentCommand } from './recent.js';
import { favoritesCommand } from './favorites.js';
import { officialPlaylistsCommand } from './official-playlists.js';
import { latestMusicCommand } from './latest-music.js';

describe('neteasemusic library commands', () => {
  it('likes command exposes liked-songs columns and limit arg', () => {
    expect(likesCommand.name).toBe('likes');
    expect(likesCommand.columns).toEqual(['Index', 'Title', 'Artist', 'Album', 'Duration']);
    expect(likesCommand.args?.[0]).toMatchObject({ name: 'limit', default: '20' });
  });

  it('recent command exposes recently-played columns and limit arg', () => {
    expect(recentCommand.name).toBe('recent');
    expect(recentCommand.columns).toEqual(['Index', 'Title', 'Artist', 'Album', 'PlayedAt']);
    expect(recentCommand.args?.[0]).toMatchObject({ name: 'limit', default: '20' });
  });

  it('favorites command exposes generic favorite item columns and limit arg', () => {
    expect(favoritesCommand.name).toBe('favorites');
    expect(favoritesCommand.columns).toEqual(['Index', 'Type', 'Title', 'Subtitle', 'Meta']);
    expect(favoritesCommand.args?.[0]).toMatchObject({ name: 'limit', default: '20' });
  });

  it('official-playlists command exposes homepage playlist columns and limit arg', () => {
    expect(officialPlaylistsCommand.name).toBe('official-playlists');
    expect(officialPlaylistsCommand.columns).toEqual(['Index', 'Title', 'Subtitle', 'PlayCount', 'PlaylistId']);
    expect(officialPlaylistsCommand.args?.[0]).toMatchObject({ name: 'limit', default: '20' });
  });

  it('latest-music command exposes homepage latest-song columns and limit arg', () => {
    expect(latestMusicCommand.name).toBe('latest-music');
    expect(latestMusicCommand.columns).toEqual(['Index', 'Title', 'Artist', 'Meta']);
    expect(latestMusicCommand.args?.[0]).toMatchObject({ name: 'limit', default: '20' });
  });
});
