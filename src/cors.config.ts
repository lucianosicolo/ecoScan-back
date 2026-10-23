/**
 * Browser origins allowed to call the EcoScan API.
 *
 * The installed Android app uses https://localhost and the browser in a phone
 * uses http://<computer-private-IP>:4200 when Angular is served on the LAN.
 * Do not allow arbitrary public origins or change the origin used by Google Maps.
 */
const defaultOrigins = new Set([
  'http://localhost',
  'https://localhost',
  'capacitor://localhost',
  'http://localhost:4200',
  'http://localhost:8100',
]);

function isPrivateIpv4(hostname: string): boolean {
  const parts = hostname.split('.');
  if (
    parts.length !== 4 ||
    parts.some((part) => !/^\d{1,3}$/.test(part) || Number(part) > 255)
  ) {
    return false;
  }

  const numbers = parts.map(Number);

  return (
    numbers[0] === 10 ||
    (numbers[0] === 172 && numbers[1] >= 16 && numbers[1] <= 31) ||
    (numbers[0] === 192 && numbers[1] === 168)
  );
}

export function isAllowedCorsOrigin(
  origin: string | undefined,
  environment: NodeJS.ProcessEnv = process.env,
): boolean {
  // Requests from native clients or server-side tools often have no Origin.
  if (!origin || defaultOrigins.has(origin)) {
    return true;
  }

  // Optional exact origins, for a chosen LAN IP or a deployed frontend.
  const explicitlyAllowed = (environment.CORS_ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  if (explicitlyAllowed.includes(origin)) {
    return true;
  }

  // In development only, Angular/Ionic launched on a private LAN address
  // must remain reachable from the phone's Chrome browser.
  if (environment.NODE_ENV === 'production') {
    return false;
  }

  try {
    const candidate = new URL(origin);
    return (
      candidate.protocol === 'http:' &&
      (candidate.port === '4200' || candidate.port === '8100') &&
      candidate.origin === origin &&
      isPrivateIpv4(candidate.hostname)
    );
  } catch {
    return false;
  }
}
