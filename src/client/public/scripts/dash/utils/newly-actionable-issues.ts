import {Issue} from '../../../../../types/api.js';

export function newlyActionableIssues(
    newList: Issue[], oldList: Issue[]): string[] {
  const result: string[] = [];

  // All issues are actionable
  const oldIds = oldList.map((issue: Issue) => issue.id);

  for (const newIssue of newList) {
    if (oldIds.indexOf(newIssue.id) === -1) {
      // New list has an actionable issue that didn't exist before
      result.push(newIssue.id);
    }
  }

  return result;
}
