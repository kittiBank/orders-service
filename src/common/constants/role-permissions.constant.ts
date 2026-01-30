import { Role } from '../enums/role.enum';
import { Permission } from '../enums/permission.enum';

/**
 * Role-based permission mapping
 * Defines what permissions each role has
 */
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.ADMIN]: [
    // Admin has all permissions
    Permission.ORDER_CREATE,
    Permission.ORDER_READ,
    Permission.ORDER_UPDATE,
    Permission.ORDER_DELETE,
    Permission.ORDER_READ_ALL,
    Permission.ORDER_UPDATE_ALL,
    Permission.ORDER_DELETE_ALL,
    Permission.USER_CREATE,
    Permission.USER_READ,
    Permission.USER_UPDATE,
    Permission.USER_DELETE,
    Permission.USER_READ_ALL,
    Permission.USER_UPDATE_ALL,
    Permission.USER_DELETE_ALL,
    Permission.ROLE_ASSIGN,
    Permission.ROLE_REVOKE,
  ],
  
  [Role.SELLER]: [
    // Seller can manage all orders
    Permission.ORDER_CREATE,
    Permission.ORDER_READ,
    Permission.ORDER_UPDATE,
    Permission.ORDER_READ_ALL,
    Permission.ORDER_UPDATE_ALL,
    Permission.USER_READ, // Can read user info for order processing
  ],
  
  [Role.CUSTOMER]: [
    // Customer can only manage their own orders
    Permission.ORDER_CREATE,
    Permission.ORDER_READ,
    Permission.ORDER_UPDATE, // Can update their own orders (before processing)
    Permission.USER_READ, // Can read their own info
    Permission.USER_UPDATE, // Can update their own info
  ],
};

/**
 * Get all permissions for a specific role
 */
export function getRolePermissions(role: Role): Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) || false;
}

/**
 * Check if a role has any of the specified permissions
 */
export function hasAnyPermission(role: Role, permissions: Permission[]): boolean {
  const rolePermissions = ROLE_PERMISSIONS[role] || [];
  return permissions.some(permission => rolePermissions.includes(permission));
}

/**
 * Check if a role has all of the specified permissions
 */
export function hasAllPermissions(role: Role, permissions: Permission[]): boolean {
  const rolePermissions = ROLE_PERMISSIONS[role] || [];
  return permissions.every(permission => rolePermissions.includes(permission));
}
