import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createPublicKey, verify, JsonWebKey } from 'node:crypto';
import {
  GOOGLE_AUTH_URL,
  GOOGLE_CERTS_URL,
  GOOGLE_ISSUERS,
  GOOGLE_TOKEN_URL,
} from './auth.constants';

export interface GoogleProfile {
  sub: string;
  email: string;
}

type Jwk = JsonWebKey & { kid?: string };

const CERTS_TTL_MS = 60 * 60 * 1000;
const CLOCK_SKEW_SECONDS = 30;

const decode = (part: string) =>
  JSON.parse(Buffer.from(part, 'base64url').toString('utf8'));

/**
 * The two calls to Google and the check of the ID token (ADR 0021): the code is
 * exchanged on the server with the PKCE verifier and the secret, and the token
 * is accepted only with a good RS256 signature of a published key, our
 * `aud`, a Google `iss`, a live `exp`, our `nonce` and a verified email.
 * Written on `node:crypto` and `fetch`; the tests replace `fetch`.
 */
@Injectable()
export class GoogleOidcService {
  private certs: { keys: Jwk[]; at: number } | null = null;

  constructor(private readonly config: ConfigService) {}

  private get clientId() {
    return this.config.get<string>('GOOGLE_CLIENT_ID') ?? '';
  }
  private get clientSecret() {
    return this.config.get<string>('GOOGLE_CLIENT_SECRET') ?? '';
  }
  private get redirectUri() {
    return this.config.get<string>('GOOGLE_REDIRECT_URI') ?? '';
  }

  isConfigured(): boolean {
    return !!(this.clientId && this.clientSecret && this.redirectUri);
  }

  authorizationUrl(p: { state: string; nonce: string; challenge: string }) {
    const url = new URL(GOOGLE_AUTH_URL);
    url.search = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state: p.state,
      nonce: p.nonce,
      code_challenge: p.challenge,
      code_challenge_method: 'S256',
      // Not `prompt=none`: the person may have several Google accounts
      prompt: 'select_account',
    }).toString();
    return url.toString();
  }

  /** The ID token for a code; throws when Google refuses. */
  async exchangeCode(code: string, codeVerifier: string): Promise<string> {
    const res = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: this.redirectUri,
        grant_type: 'authorization_code',
        code_verifier: codeVerifier,
      }),
    });
    const body = (await res.json().catch(() => ({}))) as { id_token?: string };
    if (!res.ok || !body.id_token) {
      throw new Error(`Google refused the code (${res.status})`);
    }
    return body.id_token;
  }

  async verifyIdToken(idToken: string, nonce: string): Promise<GoogleProfile> {
    const [head, body, signature, ...rest] = idToken.split('.');
    if (!head || !body || !signature || rest.length) {
      throw new Error('Malformed ID token');
    }
    const header = decode(head);
    if (header.alg !== 'RS256' || typeof header.kid !== 'string') {
      throw new Error('Unexpected algorithm of the ID token');
    }

    const jwk = await this.findKey(header.kid);
    const valid = verify(
      'RSA-SHA256',
      Buffer.from(`${head}.${body}`),
      createPublicKey({ key: jwk, format: 'jwk' }),
      Buffer.from(signature, 'base64url'),
    );
    if (!valid) {
      throw new Error('Bad signature of the ID token');
    }

    const claims = decode(body);
    const audience: unknown[] = [claims.aud].flat();
    const now = Math.floor(Date.now() / 1000);
    if (!GOOGLE_ISSUERS.includes(claims.iss)) throw new Error('Wrong issuer');
    if (!audience.includes(this.clientId)) throw new Error('Wrong audience');
    if (
      typeof claims.exp !== 'number' ||
      claims.exp + CLOCK_SKEW_SECONDS < now
    ) {
      throw new Error('The ID token has expired');
    }
    if (claims.nonce !== nonce) throw new Error('Wrong nonce');
    if (claims.email_verified !== true && claims.email_verified !== 'true') {
      throw new Error('The email is not verified by Google');
    }
    if (!claims.sub || typeof claims.email !== 'string' || !claims.email) {
      throw new Error('No subject or email in the ID token');
    }

    return { sub: String(claims.sub), email: claims.email };
  }

  /** Keys are cached for an hour; an unknown `kid` reloads them once (Google rotates the keys). */
  private async findKey(kid: string): Promise<Jwk> {
    for (const forceReload of [false, true]) {
      const keys = await this.loadKeys(forceReload);
      const key = keys.find(k => k.kid === kid);
      if (key) return key;
    }
    throw new Error('Unknown key of the ID token');
  }

  private async loadKeys(forceReload: boolean): Promise<Jwk[]> {
    if (
      !forceReload &&
      this.certs &&
      Date.now() - this.certs.at < CERTS_TTL_MS
    ) {
      return this.certs.keys;
    }
    const res = await fetch(GOOGLE_CERTS_URL);
    if (!res.ok)
      throw new Error(`Cannot load the keys of Google (${res.status})`);
    const { keys } = (await res.json()) as { keys: Jwk[] };
    this.certs = { keys, at: Date.now() };
    return keys;
  }
}
