
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
