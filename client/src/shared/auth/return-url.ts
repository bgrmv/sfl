/** Where to go after the sign-in when nothing safe was asked for. */
const HOME = '/';

/**
 * `returnUrl` comes from the address bar, so only a path inside the app is
 * accepted (an open redirect would send the person to another site after
 * the sign-in).
 */
export function safeReturnUrl(value: unknown): string {
  if (typeof value !== 'string') return HOME;
  if (!value.startsWith('/') || value.startsWith('//')) return HOME;
  if (value.includes('\\')) return HOME;
  if (/^\/sign-in(\?|#|$)/.test(value)) return HOME;
  return value;
}
