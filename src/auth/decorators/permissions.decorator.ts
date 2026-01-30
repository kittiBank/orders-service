import { SetMetadata } from '@nestjs/common';
import { Permission } from '../../common/enums/permission.enum';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Decorator to specify required permissions for a route
 * Use with PermissionsGuard
 * @param permissions - One or more permissions required to access the route
 * @example
 * @RequirePermissions(Permission.ORDER_READ_ALL)
 * @RequirePermissions(Permission.ORDER_READ, Permission.ORDER_UPDATE)
 */
export const RequirePermissions = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
