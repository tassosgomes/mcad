export function buildAssignmentId(userId: string, roleId: string): string {
  return `${encodeURIComponent(userId)}:${encodeURIComponent(roleId)}`;
}

export function parseAssignmentId(assignmentId: string): { userId: string; roleId: string } | undefined {
  const separator = assignmentId.indexOf(':');
  if (separator <= 0 || separator === assignmentId.length - 1) {
    return undefined;
  }

  try {
    return {
      userId: decodeURIComponent(assignmentId.slice(0, separator)),
      roleId: decodeURIComponent(assignmentId.slice(separator + 1)),
    };
  } catch {
    return undefined;
  }
}
