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

  const jsonResponse = await response.json();
  if (jsonResponse.error) {
    console.error(jsonResponse.error.message);
    const msgElement = document.querySelector('.oauth-msg');
    if (!msgElement) {
      console.warn('Unable to find oauth-msg element to show error.');
      return;
    }
    msgElement.textContent =
        `Unable to login with server: '${jsonResponse.error.message}'`;
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
}

handleOAuthFlow();
