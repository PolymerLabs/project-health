const PUBLIC_VAPID_KEY =
  'BOX5Lqb44uosZL4_UtV7XW9dHaBj9ERFbCzlsYZBObMZjIB-yxPIbjI5pTBgIt09iy-Hl57AWpr7lJ6QXaQjy30';

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