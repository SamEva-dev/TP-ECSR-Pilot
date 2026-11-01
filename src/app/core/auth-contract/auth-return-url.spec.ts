import { safeReturnUrl } from './auth-return-url';

describe('shared auth navigation contract', () => {
  it('preserves only same-origin app routes', () => {
    expect(safeReturnUrl('/dashboard?view=week', '/')).toBe('/dashboard?view=week');
    expect(safeReturnUrl('/signatures/123', '/')).toBe('/signatures/123');
  });

  it('rejects external, protocol-relative and encoded redirects', () => {
    for (const input of [
      'https://attacker.test', '//attacker.test', '/\\attacker.test',
      '/%2fexample.test', '/%5cexample.test', '/%252f%2fexample.test',
      '/\nadmin', '/%00admin', '/a/../admin', '/%2e%2e/admin', '/%252f%252fevil.test',
      '/login', '/connexion', '/auth/login',
    ]) {
      expect(safeReturnUrl(input, '/workspace')).toBe('/workspace');
    }
  });

  it('rejects unbounded, malformed or empty destinations', () => {
    expect(safeReturnUrl('', '/home')).toBe('/home');
    expect(safeReturnUrl('/'.padEnd(2050, 'a'), '/home')).toBe('/home');
    expect(safeReturnUrl('/%XX', '/home')).toBe('/home');
  });
});
