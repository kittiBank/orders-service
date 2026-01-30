import { SetMetadata } from '@nestjs/common';
import { Role } from '../../common/enums/role.enum';

export const ROLES_KEY = 'roles';

/**
 * Decorator to specify required roles for a route
 * Use with RolesGuard
 * @param roles - One or more roles that are allowed to access the route
 * @example
 * @Roles(Role.ADMIN)
 * @Roles(Role.ADMIN, Role.SELLER)
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
