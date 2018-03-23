export function getTrackingId() {
  const STAGING_TRACKING_ID = 'UA-114703954-2';
  const PROD_TRACKING_ID = 'UA-114703954-1';

  let trackingId = STAGING_TRACKING_ID;
  if (location.origin === 'https://github-health.appspot.com') {
    trackingId = PROD_TRACKING_ID;
  }
  return trackingId;
}
