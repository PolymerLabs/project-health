export function updateFavIcon(actionable: boolean) {
  const iconElements =
      (document.querySelectorAll('link[rel=icon]') as
       NodeListOf<HTMLLinkElement>);
  for (let i = 0; i < iconElements.length; i++) {
    const iconElement = iconElements.item(i);
    const size = iconElement.href.indexOf('32x32') === -1 ? 16 : 32;
    const actionString = actionable ? 'action-' : '';
    iconElement.href = `/images/favicon-${actionString}${size}x${size}.png`;
  }
}
