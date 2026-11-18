import { ConfigService } from '@nestjs/config';

/** `Secure` everywhere except the local development and the tests (S8.12). */
export function refreshCookieOptions(configService: ConfigService) {
  const stage = configService.get<string>('STAGE');

  return {
    httpOnly: true,
    sameSite: true,
    secure: stage !== 'development' && stage !== 'test',
    // The browser sends the cookie to the auth routes only, not to the whole API
    path: '/rest/auth',
  } as const;
}
