import { isAllowedCorsOrigin } from './cors.config';

describe('EcoScan CORS for browser and installed Android', () => {
  it('continues accepting the installed Capacitor app', () => {
    expect(isAllowedCorsOrigin('https://localhost', { NODE_ENV: 'production' })).toBe(true);
    expect(isAllowedCorsOrigin('capacitor://localhost', { NODE_ENV: 'production' })).toBe(true);
  });

  it('continues accepting localhost:4200 on the computer', () => {
    expect(isAllowedCorsOrigin('http://localhost:4200', { NODE_ENV: 'development' })).toBe(true);
  });

  it('accepts a phone browser connecting to the computer through LAN IP', () => {
    const dev = { NODE_ENV: 'development' };
    expect(isAllowedCorsOrigin('http://192.168.1.50:4200', dev)).toBe(true);
    expect(isAllowedCorsOrigin('http://10.0.0.24:4200', dev)).toBe(true);
    expect(isAllowedCorsOrigin('http://172.20.10.8:8100', dev)).toBe(true);
  });

  it('does not automatically accept any IP origin in production', () => {
    expect(isAllowedCorsOrigin('http://192.168.1.50:4200', { NODE_ENV: 'production' })).toBe(false);
    expect(isAllowedCorsOrigin('http://192.168.1.50:4200', {
      NODE_ENV: 'production',
      CORS_ALLOWED_ORIGINS: 'http://192.168.1.50:4200',
    })).toBe(true);
  });

  it('rejects unknown sites, unsafe ports and malformed addresses', () => {
    const dev = { NODE_ENV: 'development' };
    expect(isAllowedCorsOrigin('http://evil.example.com:4200', dev)).toBe(false);
    expect(isAllowedCorsOrigin('http://192.168.1.50:3000', dev)).toBe(false);
    expect(isAllowedCorsOrigin('http://999.168.1.50:4200', dev)).toBe(false);
    expect(isAllowedCorsOrigin('https://192.168.1.50:4200', dev)).toBe(false);
    expect(isAllowedCorsOrigin('http://192.168.1.50:4200.evil.test', dev)).toBe(false);
  });

  it('allows native clients without an Origin header', () => {
    expect(isAllowedCorsOrigin(undefined, { NODE_ENV: 'production' })).toBe(true);
  });
});
