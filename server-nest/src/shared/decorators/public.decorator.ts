import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

// Marks a route (or a whole controller) as accessible without a token.
// Everything else is closed by the global AuthGuard.
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
