const STAGING_TRACKING_ID = 'UA-114703954-2';
const PROD_TRACKING_ID = 'UA-114703954-1';

let trackingId = STAGING_TRACKING_ID;
if (window.location.origin === 'https://github-health.appspot.com') {
  trackingId = PROD_TRACKING_ID;
}

function getUserId() {
  const cookies = document.cookie.split(/;\s+/);
  for (const cookie of cookies) {
    const cookieDetails = cookie.split('=');
    if (cookieDetails.length !== 2) {
      continue;
    }

    const key = cookieDetails[0];
    const value = cookieDetails[1];
    if (key === 'health-id') {
      return value;
    }
  }
  return null;
}

// tslint:disable-next-line:no-any
(window as any).dataLayer = (window as any).dataLayer || [];
// tslint:disable-next-line:no-any
function gtag(...args: any[]) {
  // tslint:disable-next-line:no-any
  (window as any).dataLayer.push(args);
}
gtag('js', new Date());
const userId = getUserId();
if (userId) {
  gtag('config', trackingId, {'user_id': userId});
} else {
  gtag('config', trackingId);
}
