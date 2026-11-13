import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';

@Injectable()
export class ContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const req = context.switchToHttp().getRequest();

    const accessToken = (req as any).accessToken;

    // return accessToken for each response
    return next.handle().pipe(
      map((responseObject: any) => ({
        accessToken,
        ...responseObject,
      })),
    );
  }
}
