const STAGING_TRACKING_ID = 'UA-114703954-2';
const PROD_TRACKING_ID = 'UA-114703954-1';

let trackingId = STAGING_TRACKING_ID;
if (window.location.origin === 'https://github-health.appspot.com') {
  trackingId = PROD_TRACKING_ID;
}

// tslint:disable-next-line:no-any
(window as any).dataLayer = (window as any).dataLayer || [];
// tslint:disable-next-line:no-any
function gtag(...args: any[]) {
  // tslint:disable-next-line:no-any
  (window as any).dataLayer.push(args);
}
gtag('js', new Date());
gtag('config', trackingId);
