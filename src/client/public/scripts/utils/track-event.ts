import {EventAnalytics} from '../event-analytics.js';
import {ClientIDModel} from '../models/client-id.js';
import {getTrackingId} from '../models/tracking-id.js';

type NOTIFICATION_CATEGORIES = 'automerge'|'notification'|'push';

let clientIdModel: ClientIDModel = new ClientIDModel();
let analytics: EventAnalytics|null = null;
async function getAnalytics() {
  if (!analytics) {
    clientIdModel = new ClientIDModel();
    analytics = new EventAnalytics(getTrackingId());
  }
  return analytics;
}

export async function trackEvent(
    category: NOTIFICATION_CATEGORIES, action: string, label?: string) {
  try {
    const clientId = await clientIdModel.getId();
    const analytics = await getAnalytics();
    return analytics.trackEvent({
      clientId,
      eventAction: action,
      eventCategory: category,
      eventLabel: label,
    });
  } catch (err) {
    console.warn('Unable to track event');
    console.warn(err);
  }
}
