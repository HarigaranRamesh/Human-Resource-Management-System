import { describe, it, expect } from 'vitest';
import { resolveAssetUrl, API_URL } from '../lib/api';

describe('Asset Resolution & API Utilities', () => {
  it('should return empty string for null or undefined URLs', () => {
    expect(resolveAssetUrl(null)).toBe('');
    expect(resolveAssetUrl(undefined)).toBe('');
    expect(resolveAssetUrl('')).toBe('');
  });

  it('should preserve absolute HTTP/HTTPS URLs', () => {
    const externalUrl = 'https://images.unsplash.com/photo-123456';
    expect(resolveAssetUrl(externalUrl)).toBe(externalUrl);

    const httpUrl = 'http://example.com/asset.png';
    expect(resolveAssetUrl(httpUrl)).toBe(httpUrl);
  });

  it('should preserve base64 data URLs', () => {
    const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ';
    expect(resolveAssetUrl(dataUrl)).toBe(dataUrl);
  });

  it('should correctly prepend API_URL for relative paths', () => {
    const relative = '/uploads/avatars/user-123.png';
    const resolved = resolveAssetUrl(relative);
    expect(resolved).toBe(`${API_URL}${relative}`);

    const withoutSlash = 'uploads/documents/doc-456.pdf';
    expect(resolveAssetUrl(withoutSlash)).toBe(`${API_URL}/${withoutSlash}`);
  });
});
