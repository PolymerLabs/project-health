/**
 * This adds a global event listener for URL changes and fires a 'url-changed'
 * event with the new path upon same-origin URL navigations.
 */

/**
 * Fire an event if there are same origin changes.
 */
function globalClickHandler(event: MouseEvent) {
  if (event.defaultPrevented) {
    return;
  }

  const path = getSameOriginLink(event);
  if (!path) {
    return;
  }

  event.preventDefault();

  if (window.location.pathname === path) {
    return;
  }

  window.history.pushState({}, '', path);
  document.body.dispatchEvent(new CustomEvent('url-changed'));
}

/**
 * Determine the URL of the associated same origin link click.
 */
function getSameOriginLink(event: MouseEvent): string|undefined {
  // Only evaluate at non-modified left clicks.
  if (event.button !== 0 || event.metaKey || event.ctrlKey) {
    return;
  }

  let element: HTMLElement|null = event.target as HTMLElement;
  while (element && element.tagName !== 'A' && !element.hasAttribute('href')) {
    element = element.parentElement;
  }

  if (!element) {
    return;
  }

  const anchor = element as HTMLAnchorElement;
  if (window.location.origin !== anchor.origin) {
    return;
  }

  return anchor.pathname;
}

document.body.addEventListener('click', globalClickHandler);
