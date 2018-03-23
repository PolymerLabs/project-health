import {ClientIDModel} from './models/client-id.js';
import {getTrackingId} from './models/tracking-id.js';

// tslint:disable-next-line:no-any
(window as any).ga('create', getTrackingId(), 'auto');
// tslint:disable-next-line:no-any
(window as any).ga('send', 'pageview');
// tslint:disable-next-line:no-any
(window as any).ga(async (tracker: any) => {
  const clientId = tracker.get('clientId');
  const model = new ClientIDModel();
  await model.saveId(clientId);
});
