import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import * as v from 'valibot';

import { ValibotValidationPipe } from './valibot-validation.pipe';

const schema = v.object({
  name: v.string(),
  nested: v.object({ age: v.number() }),
});

describe('ValibotValidationPipe', () => {
  const pipe = new ValibotValidationPipe(schema);

  it('returns parsed value for valid body', () => {
    const body = { name: 'a', nested: { age: 1 } };
    expect(pipe.transform(body)).toEqual(body);
  });

  it('throws 400 with path and message for each issue', () => {
    try {
      pipe.transform({ name: 1, nested: { age: 'x' } });
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(BadRequestException);
      const res = (e as BadRequestException).getResponse() as any;
      expect((e as BadRequestException).getStatus()).toBe(400);
      expect(res.issues.map((i: any) => i.path)).toEqual([
        'name',
        'nested.age',
      ]);
      res.issues.forEach((i: any) => expect(typeof i.message).toBe('string'));
    }
  });
});
