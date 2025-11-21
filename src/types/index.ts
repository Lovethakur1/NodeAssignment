
export interface IUser {
  _id: string;
  username: string;
  email: string;
  password: string;
  role: 'admin' | 'manager' | 'user';
  team?: string;
  isEmailVerified: boolean;
  emailVerificationToken?: string;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

export interface ITask {
  _id: string;
  title: string;
  description?: string;
  dueDate?: Date;
  priority: 'low' | 'medium' | 'high';
  status: 'todo' | 'in-progress' | 'completed' | 'overdue';
  createdBy: string;
  assignedTo?: string;
  team?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITokenBlacklist {
  token: string;
  expiresAt: Date;
}

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: IUser;
    }
  }
}
