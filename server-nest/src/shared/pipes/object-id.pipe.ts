import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { isValidObjectId } from 'mongoose';

/** A route parameter that must be a MongoDB ObjectId: a broken one is 400, not a cast error. */
@Injectable()
export class ObjectIdPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!/^[0-9a-f]{24}$/i.test(value) || !isValidObjectId(value)) {
      throw new BadRequestException('Invalid id');
    }
    return value;
  }
}
