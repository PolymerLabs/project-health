export function updateFavIcon(state: 'error'|'actionable'|null) {
  let faviconFile = 'favicon';
  if (state === 'error') {
    faviconFile = 'favicon-error';
  } else if (state === 'actionable') {
    faviconFile = 'favicon-action';
  }

  const iconElements =
      (document.querySelectorAll('link[rel=icon]') as
       NodeListOf<HTMLLinkElement>);
  for (let i = 0; i < iconElements.length; i++) {
    const iconElement = iconElements.item(i);
    const size = iconElement.href.indexOf('32x32') === -1 ? 16 : 32;
    iconElement.href = `/images/${faviconFile}-${size}x${size}.png`;
  }
}
