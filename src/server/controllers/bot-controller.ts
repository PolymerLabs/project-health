
import * as JSON5 from 'json5';

import {github} from '../../utils/github';
import {githubAppModel, GithubRepo} from '../models/githubAppModel';
import {settingsModel} from '../models/settingsModel';
import {generateGithubAppToken} from '../utils/generate-github-app-token';

const LABEL_NAME_PREFIX = ':blue_heart:';
const LABEL_DESCRIPTION_SUFFIX = '- used by Project Health';

interface BotInfo {
  authToken: string;
  repos: GithubRepo[];
}

interface Label {
  name: string;
  color: string;
  description: string;
}

export function labelsAreSame(label1: Label, label2: Label) {
  return label1.description === label2.description &&
      label1.color === label2.color && label1.name === label2.name;
}

export async function setupLabels(
    token: string, repo: GithubRepo, labels: Label[]) {
  // Get current labels from repo
  const existingLabels =
      await github().get(`repos/${repo.nameWithOwner}/labels`, token, {
        customHeaders: {
          // Enable preview API which allows reading description.
          'Accept': 'application/vnd.github.symmetra-preview+json',
        }
      });
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

export async function setupPriorityIssues(enabled: boolean, botInfo: BotInfo) {
  if (typeof enabled !== 'boolean') {
    return;
  }

  if (!enabled) {
    return;
  }

  const priorityLabels = [
    {
      name: `${LABEL_NAME_PREFIX} P0`,
      description: `Critical ${LABEL_DESCRIPTION_SUFFIX}`,
      color: 'd0021b'
    },
    {
      name: `${LABEL_NAME_PREFIX} P1`,
      description: `Need ${LABEL_DESCRIPTION_SUFFIX}`,
      color: 'd0021b'
    },
    {
      name: `${LABEL_NAME_PREFIX} P2`,
      description: `Want ${LABEL_DESCRIPTION_SUFFIX}`,
      color: '0071eb'
    },
    {
      name: `${LABEL_NAME_PREFIX} P3`,
      description: `Not Critical ${LABEL_DESCRIPTION_SUFFIX}`,
      color: '0071eb'
    },
  ];

  for (const repo of botInfo.repos) {
    setupLabels(botInfo.authToken, repo, priorityLabels);
  }
}

export async function configureBot(orgName: string) {
  const settingsInfo = await settingsModel.getOrgSettings(orgName);
  if (!settingsInfo) {
    return;
  }

  const settings = JSON5.parse(settingsInfo.fileContents);
  const installation = await githubAppModel.getInstallationByName(orgName);
  if (!installation) {
    console.warn(`Installation for ${orgName} does not exist.`);
    return;
  }

  const authToken = await generateGithubAppToken(installation.installationId);
  const repos = await githubAppModel.getRepos(orgName);

  const botInfo: BotInfo = {
    authToken,
    repos,
  };

  const SETTINGS_CALLBACKS: {[key: string]: Function} = {
    'issues.priorityIssues': setupPriorityIssues,
  };
  for (const settingsKey of Object.keys(settings)) {
    const handleFunction = SETTINGS_CALLBACKS[settingsKey];
    if (!handleFunction) {
      console.warn('The settings key is not a known setting: ', settingsKey);
      continue;
    }

    try {
      await handleFunction(settings[settingsKey], botInfo);
    } catch (e) {
      console.error(`Unable to configure '${settingsKey}'`, e);
    }
  }
}
