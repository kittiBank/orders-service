export enum Permission {
  // Order permissions
  ORDER_CREATE = 'order:create',
  ORDER_READ = 'order:read',
  ORDER_UPDATE = 'order:update',
  ORDER_DELETE = 'order:delete',
  ORDER_READ_ALL = 'order:read:all',
  ORDER_UPDATE_ALL = 'order:update:all',
  ORDER_DELETE_ALL = 'order:delete:all',
  
  // User permissions
  USER_CREATE = 'user:create',
  USER_READ = 'user:read',
  USER_UPDATE = 'user:update',
  USER_DELETE = 'user:delete',
  USER_READ_ALL = 'user:read:all',
  USER_UPDATE_ALL = 'user:update:all',
  USER_DELETE_ALL = 'user:delete:all',
  
  // Role management permissions
  ROLE_ASSIGN = 'role:assign',
  ROLE_REVOKE = 'role:revoke',
}
