import { describe, expect, it, vi } from 'vitest';
vi.mock('@/lib/supabase', () => ({ supabase: {} }));
import { analyserLienVideo } from '@/lib/annonces-medias';

describe('liens vidéo des annonces (mêmes règles que seneve_051)', () => {
  it('reconnaît YouTube (watch, youtu.be, shorts) et TikTok', () => {
    expect(analyserLienVideo('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toMatchObject({ plateforme: 'youtube', integration: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ', verticale: false });
    expect(analyserLienVideo(' https://youtu.be/dQw4w9WgXcQ?si=abc ')?.integration).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
    expect(analyserLienVideo('https://youtube.com/shorts/dQw4w9WgXcQ')?.verticale).toBe(true);
    expect(analyserLienVideo('https://www.tiktok.com/@drjustin/video/7300000000000000000?lang=fr')?.integration).toBe('https://www.tiktok.com/embed/v2/7300000000000000000');
    expect(analyserLienVideo('https://vm.tiktok.com/ZMabc123/')).toMatchObject({ plateforme: 'tiktok', integration: null });
  });
  it('refuse les autres sites, http, les faux domaines et les espaces', () => {
    for (const l of ['https://exemple.com/v', 'http://youtu.be/dQw4w9WgXcQ', 'https://youtube.com.exemple.com/watch?v=dQw4w9WgXcQ', 'https://www.youtube.com/watch?v=court', 'https://youtu.be/dQw4w9WgXcQ x', 'javascript:alert(1)', '']) {
      expect(analyserLienVideo(l)).toBeNull();
    }
  });
});
