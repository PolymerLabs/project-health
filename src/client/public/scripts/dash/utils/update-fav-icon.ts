export function updateFavIcon(hasNewActions: boolean) {
  // If the page is *not* focused and there are new actionable items, set
  // favicon to orange.
  let faviconActionable = false;
  if (!document.hasFocus() && hasNewActions) {
    faviconActionable = true;
  }

  const iconElements =
      (document.querySelectorAll('link[rel=icon]') as
       NodeListOf<HTMLLinkElement>);
  for (let i = 0; i < iconElements.length; i++) {
    const iconElement = iconElements.item(i);
    const size = iconElement.href.indexOf('32x32') === -1 ? 16 : 32;
    const actionString = faviconActionable ? 'action-' : '';
    iconElement.href = `/images/favicon-${actionString}${size}x${size}.png`;
  }
}
