import * as api from '../../../../../types/api.js';

export function getUserLoginParam() {
  // This allows you to see another users dashboard.
  const userLogin = getLoginParam();
  return userLogin ? `?login=${userLogin}` : '';
}

export function getLoginParam() {
  const queryParams = new URLSearchParams(window.location.search);
  return queryParams.get('login');
}

export async function getOutgoingData(): Promise<api.OutgoingDashResponse> {
  const response = await fetch(`/api/dash/outgoing${getUserLoginParam()}`, {
    credentials: 'include',
  });

  const fullResponse = await response.json();
  if (fullResponse.error) {
    throw new Error(
        `Unable to get last known update: ${fullResponse.error.message}`);
  }

  if (!fullResponse.data) {
    throw new Error('No data provided by JSON API.');
  }

  return fullResponse.data as api.OutgoingDashResponse;
}

export async function getIncomingData(): Promise<api.IncomingDashResponse> {
  const response = await fetch(`/api/dash/incoming${getUserLoginParam()}`, {
    credentials: 'include',
  });

  const fullResponse = await response.json();
  if (fullResponse.error) {
    throw new Error(
        `Unable to get last known update: ${fullResponse.error.message}`);
  }

  if (!fullResponse.data) {
    throw new Error('No data provided by JSON API.');
  }

  return fullResponse.data as api.IncomingDashResponse;
}

export async function getLastKnownUpdate(): Promise<api.LastKnownResponse> {
  const response =
      await fetch(`/api/updates/last-known.json${getUserLoginParam()}`, {
        credentials: 'include',
      });

  const fullResponse = await response.json();
  if (fullResponse.error) {
    throw new Error(
        `Unable to get last known update: ${fullResponse.error.message}`);
  }

  if (!fullResponse.data) {
    throw new Error('No data provided by JSON API.');
  }

  return fullResponse.data;
}

export async function getAssignedIssues(): Promise<api.IssuesResponse> {
  const response = await fetch(`/api/issues/assigned${getUserLoginParam()}`, {
    credentials: 'include',
  });
  const fullResponse = await response.json();
  if (fullResponse.error) {
    throw new Error(
        `Unable to get assigned issues: ${fullResponse.error.message}`);
  }

  if (!fullResponse.data) {
    throw new Error('No data provided by JSON API.');
  }

  return fullResponse.data;
}

export async function getIssueActivity(): Promise<api.IssuesResponse> {
  const response = await fetch(`/api/issues/activity${getUserLoginParam()}`, {
    credentials: 'include',
  });
  const fullResponse = await response.json();
  if (fullResponse.error) {
    throw new Error(
        `Unable to get issue activity: ${fullResponse.error.message}`);
  }

  if (!fullResponse.data) {
    throw new Error('No data provided by JSON API.');
  }

  return fullResponse.data;
}
