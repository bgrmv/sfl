import { INestApplication } from '@nestjs/common';
import { SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';

import { buildOpenApiDocument } from './openapi';

/**
 * What every instance of the app needs, for `main.ts` and for the API tests,
 * so that they cannot drift apart: prefix, cookies, security headers.
 * Swagger is development only: in production the API does not describe itself.
 */
export function configureApp(
  app: INestApplication,
  { production }: { production: boolean },
): void {
  app.setGlobalPrefix('rest');

  // HSTS and CSP belong to the reverse proxy (S7.4); CORP stays open for the client
  app.use(
    helmet({
      contentSecurityPolicy: false,
      strictTransportSecurity: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.use(cookieParser());

  if (!production) {
    SwaggerModule.setup('rest', app, buildOpenApiDocument(app));
  }
}
