import { describe, expect, it, vi } from 'vitest';
import { main } from './index.js';

describe('ZeroTrace CLI foundation', () => {
  it('reports a version', () => {
    const spy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    try {
      expect(main(['--version'])).toBe(0);
      expect(spy).toHaveBeenCalledWith('zerotrace-ai 0.1.0\n');
    } finally {
      spy.mockRestore();
    }
  });
});
