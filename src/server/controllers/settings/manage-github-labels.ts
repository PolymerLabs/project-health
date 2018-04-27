import {github} from '../../../utils/github';
import {GithubRepo} from '../../models/githubAppModel';

// These values will be automatically added to label names and description
const LABEL_NAME_PREFIX = ':blue_heart:';
const LABEL_DESCRIPTION_SUFFIX = '- used by Project Health';

interface Label {
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
  labels = manipulateLabels(labels);
  for (const label of labels) {
    const queryUrl = `repos/${repo.nameWithOwner}/labels/${label.name}`;
    await github().delete(queryUrl, token);
  }
}

export async function ensureLabelsExist(
    token: string, repo: GithubRepo, labels: Label[]) {
  // Get current labels from repo
  const existingLabels =
      await github().get(`repos/${repo.nameWithOwner}/labels`, token, {
        customHeaders: {
          // Enable preview API which allows reading description.
          'Accept': 'application/vnd.github.symmetra-preview+json',
        }
      });

  labels = manipulateLabels(labels);

  const existingLabelsMap = new Map();
  for (const existingLabel of existingLabels) {
    existingLabelsMap.set(existingLabel.name, existingLabel);
  }

  for (const labelToMake of labels) {
    const labelAlreadyExists = existingLabelsMap.has(labelToMake.name);
    if (labelAlreadyExists &&
        labelsAreSame(labelToMake, existingLabelsMap.get(labelToMake.name))) {
      // If labels are identical, no need to create or update.
      continue;
    }

    try {
      let queryUrl = `repos/${repo.nameWithOwner}/labels`;
      let method = github().post.bind(github());
      if (labelAlreadyExists) {
        queryUrl = `repos/${repo.nameWithOwner}/labels/${labelToMake.name}`;
        method = github().patch.bind(github());
      }

      await method(queryUrl, token, labelToMake, {
        customHeaders: {
          // Enable preview API which allows settings description.
          'Accept': 'application/vnd.github.symmetra-preview+json',
        }
      });
    } catch (err) {
      console.warn(
          `Unable to create label: '${labelToMake.name}'`, err.message);
    }
  }
}
