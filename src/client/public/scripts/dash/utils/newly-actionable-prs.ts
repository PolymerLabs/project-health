import {PullRequest} from '../../../../../types/api.js';
import {statusToDisplay} from '../prs.js';

export function newlyActionablePrs(
    newList: PullRequest[], oldList: PullRequest[]): string[] {
  const result: string[] = [];

  const oldActionablePRs: {[prId: string]: PullRequest} = {};
  for (const oldPr of oldList) {
    const {actionable} = statusToDisplay(oldPr);
    if (!actionable) {
      continue;
    }

    oldActionablePRs[oldPr.id] = oldPr;
  }

  for (const newPr of newList) {
    const {actionable} = statusToDisplay(newPr);
    if (!actionable) {
      continue;
    }

    if (!oldActionablePRs[newPr.id]) {
      // New list has an actionable PR that didn't exist before
      result.push(newPr.id);
    }
  }

  return result;
}
