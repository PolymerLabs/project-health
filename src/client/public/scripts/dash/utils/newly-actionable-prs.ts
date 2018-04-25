import {PullRequest} from '../../../../../types/api.js';
import {statusToDisplay} from '../../components/pull-request.js';

export function newlyActionablePrs(
    newList: PullRequest[], oldList: PullRequest[]): string[] {
  const result: string[] = [];

  const oldActionablePRs: {[prId: string]: PullRequest} = {};
  for (const oldPr of oldList) {
    const {type} = statusToDisplay(oldPr);
    if (type === 'activity') {
      continue;
    }

    oldActionablePRs[oldPr.id] = oldPr;
  }

  for (const newPr of newList) {
    const {type} = statusToDisplay(newPr);
    if (type === 'activity') {
      continue;
    }

    if (!oldActionablePRs[newPr.id]) {
      // New list has an actionable PR that didn't exist before
      result.push(newPr.id);
    }
  }

  return result;
}
