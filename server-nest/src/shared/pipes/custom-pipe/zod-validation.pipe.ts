import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

export interface ValidationIssue {
  path: string;
  message: string;
}

/** What a zod schema offers: classic and mini schemas both fit. */
export interface SchemaParser {
  safeParse(value: unknown):
    | { success: true; data: unknown }
    | {
        success: false;
        error: { issues: { path: PropertyKey[]; message: string }[] };
      };
}

/**
 * Validates a request part with a zod schema and returns the parsed value
 * (with the transforms of the schema applied). An invalid value answers 400 with
 * `issues: [{ path, message }]`.
 */
@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: SchemaParser) {}

  transform(value: unknown) {
    const result = this.schema.safeParse(value);
    if (result.success) {
      return result.data;
    }

    // Without strictNullChecks TypeScript does not narrow by `success`
    const { error } = result as Extract<typeof result, { success: false }>;
    const issues: ValidationIssue[] = error.issues.map(issue => ({
      path: issue.path.map(String).join('.'),
      message: issue.message,
    }));

    throw new BadRequestException({
      statusCode: 400,
      message: 'Validation failed',
      issues,
    });
  }
}
