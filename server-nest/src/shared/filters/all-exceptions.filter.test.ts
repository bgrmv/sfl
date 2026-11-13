import {
  ArgumentsHost,
  ConflictException,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import { AllExceptionsFilter } from './all-exceptions.filter';

function run(exception: unknown) {
  const json = vi.fn();
  const status = vi.fn().mockReturnValue({ json });
  const host = {
    switchToHttp: () => ({ getResponse: () => ({ status }) }),
  } as unknown as ArgumentsHost;

  new AllExceptionsFilter().catch(exception, host);

  return { status: status.mock.calls[0][0], body: json.mock.calls[0][0] };
}

describe('AllExceptionsFilter', () => {
  beforeEach(() => {
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  it('keeps the status and the message of HTTP exceptions', () => {
    expect(run(new NotFoundException('Player is not found'))).toEqual({
      status: 404,
      body: {
        statusCode: 404,
        message: 'Player is not found',
        error: 'Not Found',
      },
    });
  });

  it('keeps extra fields such as validation issues', () => {
    const issues = [{ path: 'nickname', message: 'Invalid length' }];
    const { body } = run(
      new ConflictException({ message: 'Validation failed', issues }),
    );

    expect(body).toMatchObject({ statusCode: 409, issues });
  });

  it('maps a broken ObjectId (Mongoose CastError) to 400', () => {
    const { status, body } = run({ name: 'CastError', path: '_id' });

    expect(status).toBe(400);
    expect(body.message).toBe('Invalid _id');
  });

  it('maps a Mongoose ValidationError to 400 with issues', () => {
    const { status, body } = run({
      name: 'ValidationError',
      errors: { email: { path: 'email', message: 'Invalid email' } },
    });

    expect(status).toBe(400);
    expect(body.issues).toEqual([{ path: 'email', message: 'Invalid email' }]);
  });

  it('maps a duplicate key error (11000) to 409', () => {
    expect(run({ code: 11000 }).status).toBe(409);
  });

  it('hides the details of an unexpected error behind a plain 500', () => {
    const { status, body } = run(
      new Error('connection string mongodb://user:secret@host failed'),
    );

    expect(status).toBe(500);
    expect(JSON.stringify(body)).not.toContain('secret');
    expect(body.message).toBe('Internal server error');
  });
});
