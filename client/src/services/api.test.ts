import { describe, it, expect, beforeEach, vi } from 'vitest';
import { api, resolveApiBaseUrl } from './api';

describe('Client API Service', () => {
  const storageMock: Record<string, string> = {};

  beforeEach(() => {
    for (const key in storageMock) {
      delete storageMock[key];
    }
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => storageMock[key] ?? null),
      setItem: vi.fn((key: string, val: string) => {
        storageMock[key] = val;
      }),
      removeItem: vi.fn((key: string) => {
        delete storageMock[key];
      }),
      clear: vi.fn(() => {
        for (const key in storageMock) {
          delete storageMock[key];
        }
      }),
    });
  });

  it('should have base configuration set up', () => {
    expect(api.defaults.headers['Content-Type']).toBe('application/json');
    expect(api.defaults.withCredentials).toBe(true);
  });

  it('should attach Bearer token from localStorage when present', async () => {
    localStorage.setItem('token', 'sample-test-token');
    const requestHandler = (api.interceptors.request as any).handlers[0].fulfilled;
    const config = { headers: {} as Record<string, string> };
    const updatedConfig = await requestHandler(config);
    expect(updatedConfig.headers.Authorization).toBe('Bearer sample-test-token');
  });

  it('should extract error message from response in error interceptor', async () => {
    const errorHandler = (api.interceptors.response as any).handlers[0].rejected;
    const fakeError = {
      response: {
        data: {
          error: {
            message: 'Custom operational error message',
            code: 'NOT_FOUND',
          },
        },
      },
    };

    await expect(errorHandler(fakeError)).rejects.toThrow('Custom operational error message');
  });
});

describe('resolveApiBaseUrl', () => {
  it('defaults to the same-origin /api proxy', () => {
    expect(resolveApiBaseUrl(undefined)).toBe('/api');
    expect(resolveApiBaseUrl('')).toBe('/api');
  });
  it('keeps a full URL that already ends in /api', () => {
    expect(resolveApiBaseUrl('http://localhost:5000/api')).toBe('http://localhost:5000/api');
    expect(resolveApiBaseUrl('https://x.example.com/api/')).toBe('https://x.example.com/api');
  });
  it('turns a bare Render host into an https /api URL', () => {
    expect(resolveApiBaseUrl('uma-bhavan-api.onrender.com')).toBe('https://uma-bhavan-api.onrender.com/api');
  });
  it('appends /api to a URL without it', () => {
    expect(resolveApiBaseUrl('https://api.example.com')).toBe('https://api.example.com/api');
  });
});
