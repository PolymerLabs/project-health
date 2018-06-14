import {github} from '../../../utils/github';
import {GithubRepo} from '../../models/githubAppModel';

// These values will be automatically added to label names and description
export const LABEL_NAME_PREFIX = ':blue_heart:';
export const LABEL_DESCRIPTION_SUFFIX = '- used by Project Health';

export interface Label {
  name: string;
  color: string;
  description: string;
}

function manipulateLabels(labels: Label[]) {
  return labels.map((label): Label => {
    return {
      name: `${LABEL_NAME_PREFIX} ${label.name}`,
      color: label.color,
      description: `${label.description} ${LABEL_DESCRIPTION_SUFFIX}`,
    };
  });
}

function labelsAreSame(label1: Label, label2: Label) {
  return label1.description === label2.description &&
      label1.color === label2.color && label1.name === label2.name;
}

export async function deleteLabels(
    token: string, repo: GithubRepo, labels: Label[]) {
  await setLabels(token, repo, labels, false);
}

export async function addLabels(
    token: string, repo: GithubRepo, labels: Label[]) {
  await setLabels(token, repo, labels, true);
}

/**
 * This adds/removes labels by first checking what existing labels are being
 * used.
 */
async function setLabels(
    token: string, repo: GithubRepo, labels: Label[], shouldExist: boolean) {
  // Get current labels from repo
  const response =
      await github().get(`repos/${repo.nameWithOwner}/labels`, token, {
        // Enable preview API which allows reading description.
        'Accept': 'application/vnd.github.symmetra-preview+json',
      });
  const existingLabels = await response.json();

  labels = manipulateLabels(labels);

  const existingLabelsMap = new Map();
  for (const existingLabel of existingLabels) {
    existingLabelsMap.set(existingLabel.name, existingLabel);
  }

  for (const label of labels) {
    const labelAlreadyExists = existingLabelsMap.has(label.name);
    if (shouldExist && labelAlreadyExists &&
        labelsAreSame(label, existingLabelsMap.get(label.name))) {
      // If labels are identical, no need to create or update.
      continue;
    } else if (!shouldExist && !labelAlreadyExists) {
      // Label isn't there and doesn't need to be.
      continue;
    }

    try {
      let queryUrl: string;
      let method;
      const gh = github();

      if (!shouldExist) {
        // Delete existing label.
        queryUrl = `repos/${repo.nameWithOwner}/labels/${label.name}`;
        method = gh.delete.bind(gh);
      } else if (shouldExist && labelAlreadyExists) {
        // Update existing label.
        queryUrl = `repos/${repo.nameWithOwner}/labels/${label.name}`;
        method = gh.patch.bind(gh);
      } else {
        // Create label.
        queryUrl = `repos/${repo.nameWithOwner}/labels`;
        method = gh.post.bind(gh);
      }

      await method(queryUrl, token, label, {
        // Enable preview API which allows settings description.
        'Accept': 'application/vnd.github.symmetra-preview+json',
      });
    } catch (err) {
      console.warn(
          `Unable to update label: '${label.name}'. Should exist: '${
              shouldExist}'`,
          err.message);
    }
  }
}
