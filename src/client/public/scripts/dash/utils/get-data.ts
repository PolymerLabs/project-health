import * as api from '../../../../../types/api.js';

function getUserLoginParam() {
  // This allows you to see another users dashboard.
  const queryParams = new URLSearchParams(window.location.search);
  const userLogin = queryParams.get('login');
  return userLogin ? `?login=${userLogin}` : '';
}

export async function getOutgoingData(): Promise<api.OutgoingDashResponse> {
  const response = await fetch(`/api/dash/outgoing${getUserLoginParam()}`, {
    credentials: 'include',
  });
  return await response.json() as api.OutgoingDashResponse;
}

export async function getIncomingData(): Promise<api.IncomingDashResponse> {
  const response = await fetch(`/api/dash/incoming${getUserLoginParam()}`, {
    credentials: 'include',
  });
  return await response.json() as api.IncomingDashResponse;
}

export async function getLastKnownUpdate(): Promise<api.LastKnownResponse> {
  const response =
      await fetch(`/api/updates/last-known.json${getUserLoginParam()}`, {
        credentials: 'include',
      });

  const fullResponse =
      await response.json() as api.JSONAPIResponse<api.LastKnownResponse>;
  if (fullResponse.error) {
    throw new Error(
        `Unable to get last known update: ${fullResponse.error.message}`);
  }

  if (!fullResponse.data) {
    throw new Error('No data provided by JSON API.');
  }

  return fullResponse.data;
}
