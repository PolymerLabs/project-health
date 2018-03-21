import {ClientIDModel} from './models/client-id.js';

const STAGING_TRACKING_ID = 'UA-114703954-2';
const PROD_TRACKING_ID = 'UA-114703954-1';

let trackingId = STAGING_TRACKING_ID;
if (window.location.origin === 'https://github-health.appspot.com') {
  trackingId = PROD_TRACKING_ID;
}

// tslint:disable-next-line:no-any
(window as any).ga('create', trackingId, 'auto');
// tslint:disable-next-line:no-any
(window as any).ga('send', 'pageview');
// tslint:disable-next-line:no-any
(window as any).ga(async (tracker: any) => {
  const clientId = tracker.get('clientId');
  const model = new ClientIDModel();
  await model.saveId(clientId);
});
