import { map, type OperatorFunction } from 'rxjs';

/** What a zod schema offers, so that the client needs no direct dependency on zod. */
export interface ResponseParser<T> {
  safeParse(data: unknown):
    | { success: true; data: T }
    | {
        success: false;
        error: { issues: { path: PropertyKey[]; message: string }[] };
      };
}

/**
 * Checks a response of the API against its shared schema (@sfl/schemas), at the
 * boundary where untrusted data enters the app.
 *
 * Valid data comes out parsed (defaults applied, e.g. `goalsByAuto` of an old
 * game). Data that breaks the contract is reported with `console.error`, path
 * and message of every issue, and passed on as it is: the screen keeps working
 * while the mismatch is visible. Switch `STRICT` on to turn a mismatch into an
 * error once the real data has been checked.
 */
export const STRICT = false;

export function checkedResponse<T>(
  parser: ResponseParser<T>,
  source: string,
): OperatorFunction<unknown, T> {
  return map(data => {
    const result = parser.safeParse(data);
    if (result.success) {
      return result.data;
    }

    const issues = result.error.issues.map(
      issue =>
        `${issue.path.map(String).join('.') || '(root)'}: ${issue.message}`,
    );
    console.error(`API contract violation in ${source}`, issues);

    if (STRICT) {
      throw new Error(
        `API contract violation in ${source}: ${issues.join('; ')}`,
      );
    }

    return data as T;
  });
}
