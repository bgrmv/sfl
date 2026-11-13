import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

import * as v from 'valibot';

export interface ValidationIssue {
  path: string;
  message: string;
}

const toPath = (issue: v.ValiError['issues'][number]): string =>
  (issue.path ?? [])
    .map((item: { key: unknown }) => String(item.key))
    .join('.');

@Injectable()
export class ValibotValidationPipe implements PipeTransform {
  constructor(private schema: v.BaseSchema) {}

  transform(value: unknown) {
    try {
      return v.parse(this.schema, value);
    } catch (error) {
      if (error instanceof v.ValiError) {
        const issues: ValidationIssue[] = error.issues.map(issue => ({
          path: toPath(issue),
          message: issue.message,
        }));

        throw new BadRequestException({
          statusCode: 400,
          message: 'Validation failed',
          issues,
        });
      }

      throw error; // Re-throw unexpected errors
    }
  }
}
