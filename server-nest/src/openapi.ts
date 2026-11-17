import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import { openApiRef, openApiSchemas } from '@sfl/schemas';

/**
 * The OpenAPI document of the API (S3.19, ADR 0018): the routes come from the
 * controllers, the bodies and the error answer from the zod schemas of
 * `@sfl/schemas`, so the description cannot drift from what is validated.
 */
export function buildOpenApiDocument(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle('SFL docs')
    .setDescription(
      'The SFL API docs. Every answer is `{ ok: true, data }` or `{ ok: false, error }` (ADR 0011).',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addSecurityRequirements('bearer')
    .build();
  const document = SwaggerModule.createDocument(app, config);

  document.components = {
    ...document.components,
    schemas: { ...document.components?.schemas, ...openApiSchemas() },
  };

  // Any route can answer with the error body
  for (const path of Object.values(document.paths)) {
    for (const operation of Object.values(path)) {
      if (
        operation &&
        typeof operation === 'object' &&
        'responses' in operation
      ) {
        operation.responses.default ??= {
          description: 'The error: `ok: false`, a stable `code`, a message',
          content: {
            'application/json': { schema: openApiRef('ErrorResponse') },
          },
        };
      }
    }
  }

  return document;
}
