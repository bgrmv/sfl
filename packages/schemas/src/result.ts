// `Result<T, E>`: a success or a failure in one container with one interface,
// like `Result` in Rust. An error is a value, not a jump out of the flow.
// On the network it is `SerializedResult<T, E>`, in the code it is `Ok` / `Err`
// with `map`, `mapErr`, `andThen`, `match`, `unwrapOr`. `fromSerialized` turns
// the JSON of the API back into the container.

/** The JSON form of a result: what the API sends and the client receives. */
export type SerializedResult<T, E> =
  { ok: true; data: T } | { ok: false; error: E };

export interface IResult<T, E> {
  readonly ok: boolean;
  /** Transforms the value of a success (`map` in Rust). */
  map<U>(fn: (value: T) => U): Result<U, E>;
  /** Transforms the error of a failure (`map_err`). */
  mapErr<F>(fn: (error: E) => F): Result<T, F>;
  /** Chains an operation that returns a result (`and_then`, `flatMap`). */
  andThen<U>(fn: (value: T) => Result<U, E>): Result<U, E>;
  /** The one way out of the container (`match`). */
  match<U>(handlers: { ok: (value: T) => U; err: (error: E) => U }): U;
  /** The value, or the default for a failure (`unwrap_or`). */
  unwrapOr(defaultValue: T): T;
  /** A plain object for `JSON.stringify` and the HTTP body. */
  toJSON(): SerializedResult<T, E>;
}

export class Ok<T, E = never> implements IResult<T, E> {
  readonly ok = true as const;

  constructor(readonly value: T) {}

  map<U>(fn: (value: T) => U): Result<U, E> {
    return new Ok(fn(this.value));
  }

  mapErr<F>(_fn: (error: E) => F): Result<T, F> {
    return new Ok(this.value);
  }

  andThen<U>(fn: (value: T) => Result<U, E>): Result<U, E> {
    return fn(this.value);
  }

  match<U>(handlers: { ok: (value: T) => U; err: (error: E) => U }): U {
    return handlers.ok(this.value);
  }

  unwrapOr(_defaultValue: T): T {
    return this.value;
  }

  toJSON(): SerializedResult<T, E> {
    return { ok: true, data: this.value };
  }
}

export class Err<T = never, E = unknown> implements IResult<T, E> {
  readonly ok = false as const;

  constructor(readonly error: E) {}

  map<U>(_fn: (value: T) => U): Result<U, E> {
    return new Err(this.error);
  }

  mapErr<F>(fn: (error: E) => F): Result<T, F> {
    return new Err(fn(this.error));
  }

  andThen<U>(_fn: (value: T) => Result<U, E>): Result<U, E> {
    return new Err(this.error);
  }

  match<U>(handlers: { ok: (value: T) => U; err: (error: E) => U }): U {
    return handlers.err(this.error);
  }

  unwrapOr(defaultValue: T): T {
    return defaultValue;
  }

  toJSON(): SerializedResult<T, E> {
    return { ok: false, error: this.error };
  }
}

export type Result<T, E> = Ok<T, E> | Err<T, E>;

export const ok = <T, E = never>(value: T): Result<T, E> => new Ok(value);
export const err = <T = never, E = unknown>(error: E): Result<T, E> =>
  new Err(error);

/** JSON from the network back to the container. */
export const fromSerialized = <T, E>(
  raw: SerializedResult<T, E>,
): Result<T, E> => (raw.ok ? ok(raw.data) : err(raw.error));

/**
 * The boundary with code that throws: a promise becomes a result.
 * `mapError` gives the error its typed shape.
 */
export async function fromPromise<T, E>(
  promise: Promise<T>,
  mapError: (raw: unknown) => E,
): Promise<Result<T, E>> {
  try {
    return ok(await promise);
  } catch (raw) {
    return err(mapError(raw));
  }
}
