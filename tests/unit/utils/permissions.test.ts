import { canAccessTask, canAssignTask, canAssignRole } from '../../../src/utils/permissions';
import { mockUser, mockTask, mockAdminUser, mockManagerUser } from '../../setup/testHelpers';

describe('Permissions', () => {
  describe('canAccessTask', () => {
    const admin = mockAdminUser();
    const manager = mockManagerUser();
    const user = mockUser();
    const userOtherTeam = mockUser({ team: 'Sales' });

    it('should allow admin to access any task', () => {
      const task = mockTask();

      const result = canAccessTask(admin, task);

      expect(result).toBe(true);
    });

    it('should allow manager to access team tasks', () => {
      const task = mockTask({ team: 'Engineering' });

      const result = canAccessTask(manager, task);

      expect(result).toBe(true);
    });

    it('should allow user to access own created tasks', () => {
      const task = mockTask({ createdBy: user._id });

      const result = canAccessTask(user, task);

      expect(result).toBe(true);
    });

    it('should allow user to access assigned tasks', () => {
      const task = mockTask({ assignedTo: user._id });

      const result = canAccessTask(user, task);

      expect(result).toBe(true);
    });

    it('should deny user access to other team tasks', () => {
      const task = mockTask({
        team: 'Sales',
        createdBy: 'other-user-id',
        assignedTo: null,
      });

      const result = canAccessTask(user, task);

      expect(result).toBe(false);
    });

    it('should deny user access to unrelated tasks', () => {
      const task = mockTask({
        team: 'Engineering',
        createdBy: 'other-user-id',
        assignedTo: 'another-user-id',
      });

      const result = canAccessTask(user, task);

      expect(result).toBe(false);
    });
  });

  describe('canAssignTask', () => {
    const admin = mockAdminUser();
    const manager = mockManagerUser();
    const user = mockUser();

    it('should allow admin to assign tasks', () => {
      const result = canAssignTask(admin);

      expect(result).toBe(true);
    });

    it('should allow manager to assign tasks', () => {
      const result = canAssignTask(manager);

      expect(result).toBe(true);
    });

    it('should deny regular user from assigning tasks', () => {
      const result = canAssignTask(user);

      expect(result).toBe(false);
    });
  });

  describe('canAssignRole', () => {
    const admin = mockAdminUser();
    const manager = mockManagerUser();
    const user = mockUser();

    it('should allow admin to assign any role', () => {
      expect(canAssignRole(admin, 'admin')).toBe(true);
      expect(canAssignRole(admin, 'manager')).toBe(true);
      expect(canAssignRole(admin, 'user')).toBe(true);
    });

    it('should deny non-admin from assigning admin role', () => {
      expect(canAssignRole(manager, 'admin')).toBe(false);
      expect(canAssignRole(user, 'admin')).toBe(false);
    });

    it('should deny non-admin from assigning manager role', () => {
      expect(canAssignRole(manager, 'manager')).toBe(false);
      expect(canAssignRole(user, 'manager')).toBe(false);
    });

    it('should deny non-admin from assigning any role', () => {
      expect(canAssignRole(manager, 'user')).toBe(false);
      expect(canAssignRole(user, 'user')).toBe(false);
    });
  });
});
