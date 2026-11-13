declare global {
  namespace Express {
    // These open interfaces may be extended in an application-specific manner via declaration merging.
    // See for example method-override.d.ts (https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/method-override/index.d.ts)
    export interface Request {
      user?: Partial<import('./entities/users').User>; // Define your custom property
      cookies?: Record<string, any>;
    }
    interface Response {}
    interface Locals {}
    interface Application {}
  }
}

type WithId<T> = T & { id: string };

type TResponse<T> = {
  data: T;
  error?: {
    code: number;
    message: string;
  };
  meta?: {
    total: number;
    page: number;
    pageSize: number;
  };
};
