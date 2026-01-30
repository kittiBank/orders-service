import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Decorator to get the current authenticated user from request
 * @example
 * @Get('profile')
 * getProfile(@CurrentUser() user) {
 *   return user;
 * }
 * 
 * // Get specific property
 * @Get('email')
 * getEmail(@CurrentUser('email') email: string) {
 *   return email;
 * }
 */
export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    return data ? user?.[data] : user;
  },
);
