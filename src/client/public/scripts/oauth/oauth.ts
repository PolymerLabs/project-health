import {JSONAPIResponse, LoginResponse} from '../../../../types/api';

const CLIENT_ID = '23b7d82aec29a3a1a2a8';
const REDIRECT_ORIGIN = window.location.origin;

function handleOriginRedirect(
    redirectOrigin: string, queryParams: URLSearchParams) {
  // This redirect allows testing on localhost or on the remote server
  const redirectOauthURL = new URL(window.location.pathname, redirectOrigin);

  // Remove the redirect origin and redirect with remaining search params
  queryParams.delete('redirect-origin');

  // Add remaining search parameters to the redirected origin
  redirectOauthURL.search = queryParams.toString();

  // Redirect the page to the new origin
  window.location.href = redirectOauthURL.toString();
}

async function handleLoginCode(code: string, queryParams: URLSearchParams) {
  // User just logged in and we have the code from Github
  const response = await fetch('/api/login', {
    method: 'POST',
    body: code,
    credentials: 'include',
  });

  const jsonResponse =
      (await response.json()) as JSONAPIResponse<LoginResponse>;
  if (jsonResponse.error) {
    console.error(jsonResponse.error.message);
    return;
  }

  window.location.href = queryParams.get('final-redirect') || '/';
}

async function handleOAuthFlow() {
  const queryParams = new URLSearchParams(window.location.search);

  const redirectOrigin = queryParams.get('redirect-origin');
  if (redirectOrigin) {
    handleOriginRedirect(redirectOrigin, queryParams);
    return;
  }

  const code = queryParams.get('code');
  if (code) {
    handleLoginCode(code, queryParams);
    return;
  }

  if (queryParams.has('error')) {
    // User logged in but there is an error from Github
    throw new Error(
        `Error returned by Github: '${queryParams.get('error_description')}'`);
  }

  const properties: {[key: string]: string} = {
    client_id: CLIENT_ID,
    scope: queryParams.get('scope') || '',
    redirect_uri: encodeURIComponent(
        `https://github-health.appspot.com/oauth.html?redirect-origin=${
            REDIRECT_ORIGIN}&final-redirect=${
            queryParams.get('final-redirect') || ''}`),
  };
  const searchValues = Object.keys(properties).map((keyName) => {
    return `${keyName}=${properties[keyName]}`;
  });
  window.location.href =
      `https://github.com/login/oauth/authorize?${searchValues.join('&')}`;
}

handleOAuthFlow();
