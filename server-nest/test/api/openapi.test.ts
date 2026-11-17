// The contract of the API (S3.19, ADR 0018): the OpenAPI document made from the
// controllers and the zod schemas is committed as `openapi.json`. A change of a
// route, a body or a schema shows up here; the author looks at the diff and
// updates the file: `UPDATE_OPENAPI=1 pnpm vitest run test/api/openapi.test.ts`.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildOpenApiDocument } from '../../src/openapi';
import { createTestApp, TestApp } from '../helpers/test-app';

const FILE = resolve(__dirname, '../../openapi.json');

describe('API: OpenAPI contract', () => {
  let t: TestApp;
  let document: ReturnType<typeof buildOpenApiDocument>;

  beforeAll(async () => {
    t = await createTestApp();
    document = JSON.parse(JSON.stringify(buildOpenApiDocument(t.app)));
  });
  afterAll(() => t.close());

  it('equals the committed openapi.json', () => {
    if (process.env.UPDATE_OPENAPI) {
      writeFileSync(FILE, JSON.stringify(document, null, 2) + '\n');
    }

    expect(document).toEqual(JSON.parse(readFileSync(FILE, 'utf8')));
  });

  it('describes the bodies of a game with the schema, not by hand', () => {
    const body = (path: string, method: string) =>
      (document.paths[path] as any)[method].requestBody.content[
        'application/json'
      ].schema;

    expect(body('/rest/games', 'post')).toEqual({
      $ref: '#/components/schemas/GameInput',
    });
    expect(body('/rest/games/{id}', 'put')).toEqual({
      $ref: '#/components/schemas/GameInput',
    });
    expect(body('/rest/games/{id}', 'patch')).toEqual({
      $ref: '#/components/schemas/GameUpdateInput',
    });
  });

  it('every operation can answer with the common error body', () => {
    const operations = Object.values(document.paths).flatMap(path =>
      Object.values(path as object),
    ) as { responses: Record<string, any> }[];

    expect(operations.length).toBeGreaterThan(20);
    for (const operation of operations) {
      expect(operation.responses.default.content['application/json']).toEqual({
        schema: { $ref: '#/components/schemas/ErrorResponse' },
      });
    }
  });
});
