import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Permission } from '../../common/enums/permission.enum';
import { getRolePermissions } from '../../common/constants/role-permissions.constant';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

/**
 * Guard to check if user has required permission(s)
 * Use with @RequirePermissions() decorator
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no permissions are required, allow access
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // User should be set by JwtAuthGuard
    if (!user || !user.role) {
      throw new ForbiddenException('User not authenticated');
    }

    // Get permissions for user's role
    const userPermissions = getRolePermissions(user.role);

    // Check if user has all required permissions
    const hasAllPermissions = requiredPermissions.every((permission) =>
      userPermissions.includes(permission),
    );

    if (!hasAllPermissions) {
      throw new ForbiddenException(
        `Access denied. Required permissions: ${requiredPermissions.join(', ')}`,
      );
    }

    return true;
  }
}
