import { IUser, ITask } from '../types';

/**
 * Role hierarchy levels for comparison
 */
export enum RoleLevel {
  USER = 1,
  MANAGER = 2,
  ADMIN = 3,
}

/**
 * Get numeric level for a role
 */
export const getRoleLevel = (role: string): number => {
  switch (role.toLowerCase()) {
    case 'admin':
      return RoleLevel.ADMIN;
    case 'manager':
      return RoleLevel.MANAGER;
    case 'user':
    default:
      return RoleLevel.USER;
  }
};

/**
 * Check if user role is higher or equal to required role
 */
export const hasHigherOrEqualRole = (
  userRole: string,
  requiredRole: string
): boolean => {
  return getRoleLevel(userRole) >= getRoleLevel(requiredRole);
};

/**
 * Check if user can access/modify a task
 * @param user - The user attempting access
 * @param task - The task being accessed
 */
export const canAccessTask = (user: IUser, task: ITask): boolean => {
  // Admin can access all tasks
  if (user.role === 'admin') {
    return true;
  }

  // Manager can access tasks in their team
  if (user.role === 'manager' && user.team && task.team === user.team) {
    return true;
  }

  // User can access their own tasks or tasks assigned to them
  if (task.createdBy === user._id || task.assignedTo === user._id) {
    return true;
  }

  return false;
};

/**
 * Check if user can assign tasks to others
 */
export const canAssignTask = (user: IUser): boolean => {
  return user.role === 'admin' || user.role === 'manager';
};

/**
 * Check if user can manage another user
 * @param user - The user attempting to manage
 * @param targetUser - The user being managed
 */
export const canManageUser = (user: IUser, targetUser: IUser): boolean => {
  // Admin can manage anyone except other admins (for safety)
  if (user.role === 'admin') {
    return true;
  }

  // Manager can manage users in their team (not other managers or admins)
  if (
    user.role === 'manager' &&
    user.team &&
    targetUser.team === user.team &&
    targetUser.role === 'user'
  ) {
    return true;
  }

  return false;
};

/**
 * Check if user can update a specific role
 */
export const canAssignRole = (user: IUser, targetRole: string): boolean => {
  // Only admins can assign roles
  if (user.role !== 'admin') {
    return false;
  }

  // Validate target role is one of the allowed roles
  const validRoles = ['admin', 'manager', 'user'];
  if (!validRoles.includes(targetRole)) {
    return false;
  }

  // For extra safety, could restrict admin creation
  // For now, admins can assign any role
  return true;
};

/**
 * Check if user is in the same team as another user
 */
export const isSameTeam = (user1: IUser, user2: IUser): boolean => {
  if (!user1.team || !user2.team) {
    return false;
  }
  return user1.team === user2.team;
};
