export type UserRole = 'creator' | 'manager' | 'reviewer' | 'client_viewer';
export type DraftStatus = 'draft' | 'in_review' | 'changes_requested' | 'approved';

export class WorkflowPermissionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WorkflowPermissionError';
  }
}

/**
 * Validates whether a user role is permitted to transition a draft between statuses.
 */
export function validateStatusTransition(
  role: UserRole,
  currentStatus: DraftStatus,
  targetStatus: DraftStatus
): void {
  if (currentStatus === targetStatus) {
    return;
  }

  // 1. Client Viewers can NEVER alter draft states
  if (role === 'client_viewer') {
    throw new WorkflowPermissionError('Client viewers hold read-and-comment permissions only.');
  }

  // 2. Creators can submit drafts for review
  if (role === 'creator') {
    if (currentStatus === 'draft' && targetStatus === 'in_review') return;
    if (currentStatus === 'changes_requested' && targetStatus === 'in_review') return;
    throw new WorkflowPermissionError(`Creators cannot transition draft status from '${currentStatus}' to '${targetStatus}'.`);
  }

  // 3. Managers can request changes or submit
  if (role === 'manager') {
    if (currentStatus === 'in_review' && targetStatus === 'changes_requested') return;
    if (currentStatus === 'draft' && targetStatus === 'in_review') return;
    // Managers can recommend approval or route to reviewer
    if (currentStatus === 'in_review' && targetStatus === 'approved') return;
    throw new WorkflowPermissionError(`Managers cannot transition draft status from '${currentStatus}' to '${targetStatus}'.`);
  }

  // 4. Reviewers have final approval authority
  if (role === 'reviewer') {
    if (currentStatus === 'in_review' && targetStatus === 'approved') return;
    if (currentStatus === 'in_review' && targetStatus === 'changes_requested') return;
    return;
  }

  throw new WorkflowPermissionError(`Unauthorized status transition from '${currentStatus}' to '${targetStatus}'.`);
}

/**
 * Validates finding decision permissions (Accept, Dismiss, Request Exception).
 */
export function validateFindingDecision(role: UserRole): void {
  if (role === 'client_viewer') {
    throw new WorkflowPermissionError('Client viewers cannot dismiss or resolve compliance findings.');
  }
}
