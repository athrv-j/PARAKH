export type UserRole = 'creator' | 'manager' | 'reviewer' | 'client_viewer';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name?: string;
  role: UserRole;
  clientAccess: string[]; // List of client_ids this user is allowed to access
}

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  client_viewer: 1,
  creator: 2,
  reviewer: 3,
  manager: 4
};

export function hasRole(userRole: UserRole, requiredRoles: UserRole[]): boolean {
  return requiredRoles.includes(userRole);
}

export function canTransitionStatus(userRole: UserRole, targetStatus: string): boolean {
  if (userRole === 'client_viewer') return false;
  if (userRole === 'creator') {
    // Creators can only submit to in_review or keep in draft
    return targetStatus === 'draft' || targetStatus === 'in_review';
  }
  // Reviewers and managers can approve or request changes
  return true;
}

export function canModifyGuidelines(userRole: UserRole): boolean {
  return userRole === 'manager';
}
