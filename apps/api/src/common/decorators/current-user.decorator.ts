import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { UserRole } from '@class10/types';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
    if (!request.user) {
      throw new Error('No authenticated user on request — is the auth guard applied?');
    }
    return request.user;
  },
);