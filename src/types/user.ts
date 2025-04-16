
export enum UserRole {
  REGULAR = 'regular',
  SUPERUSER = 'superuser'
}

export interface UserProfile {
  id: string;
  email: string;
  name?: string | null;
  club_name: string;
  role: UserRole;
}

// Add helper function to check user roles
export const isUserSuperuser = (userRole?: string): boolean => {
  return userRole === UserRole.SUPERUSER;
};
