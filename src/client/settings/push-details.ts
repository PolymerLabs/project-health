// TODO: Inject this value server side
const PUBLIC_VAPID_KEY =
    'BJIJahSkYD0liSj6vQnq_UiGT9fbFqQpCxv7x7M2sAg55RiGKa5Gs2fSPF9UV-mviBQ1raDve6VofMi1wGagagU';

/**
 * The pushManage.subscribe() method expects an ArrayBuffer and not a string.
 * This method converts a base64 string into a Uint8Array.
 *
 * (Note: The spec has changed to allow strings, but browser support is lacking)
 */
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 =
      (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

const applicationServerKey = urlBase64ToUint8Array(PUBLIC_VAPID_KEY);
export {applicationServerKey};
