interface EventOpts {
  clientId: string;
  eventCategory: string;
  eventAction: string;
  eventLabel?: string;
}

const DEBUG = false;

// Make use of Google Analytics Measurement Protocol.
// https://developers.google.com/analytics/devguides/collection/protocol/v1/reference
export class EventAnalytics {
  private trackingId: string;
  private dataSource: string;

  constructor(trackingId: string) {
    this.trackingId = trackingId;
    this.dataSource = 'Project Health Client';
  }

  async trackEvent(opts: EventOpts) {
    // We want this to be a safe method, so avoid throwing Unless
    // It's absolutely necessary.
    if (!this.trackingId) {
      console.error('You need to set a trackingId');
      return;
    }

    if (typeof opts.eventAction === 'undefined') {
      console.warn('sendAnalyticsEvent() called with no eventAction.');
      return;
    }

    const payloadData: {[key: string]: string|number} = {
      // Version Number
      v: 1,
      // Client ID
      cid: encodeURIComponent(opts.clientId),
      // Tracking ID
      tid: this.trackingId,
      // Hit Type
      t: 'event',
      // Data Source
      ds: this.dataSource,
      // Event Category
      ec: opts.eventCategory,
      // Event Action
      ea: opts.eventAction,
    };

    if (opts.eventLabel) {
      payloadData.el = opts.eventLabel;
    }

    const payloadString =
        Object.keys(payloadData)
            .filter((analyticsKey: string) => {
              return payloadData[analyticsKey];
            })
            .map((analyticsKey) => {
              return `${analyticsKey}=` +
                  encodeURIComponent(payloadData[analyticsKey].toString());
            })
            .join('&');

    const response = await fetch(
        `https://www.google-analytics.com/${DEBUG ? 'debug/' : ''}collect`, {
          method: 'post',
          body: payloadString,
        });

    if (!response.ok) {
      const responseText = await response.text();
      console.error(`Bad response from Google Analytics [${response.status}] ${
          responseText}`);
    }
  }
}
