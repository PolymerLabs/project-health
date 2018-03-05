// Make use of Google Analytics Measurement Protocol.
// https://developers.google.com/analytics/devguides/collection/protocol/v1/reference
export class Analytics {
  private trackingId: string;

  constructor(trackingId: string) {
    this.trackingId = trackingId;
  }

  async trackEvent(
      clientId: string,
      eventAction: string,
      eventValue: string,
      optionalParams?: {}) {
    if (!this.trackingId) {
      console.error('You need to set a trackingId, for example:');
      console.error('self.analytics.trackingId = \'UA-XXXXXXXX-X\';');

      // We want this to be a safe method, so avoid throwing Unless
      // It's absolutely necessary.
      return;
    }

    if (typeof eventAction === 'undefined' &&
        typeof eventValue === 'undefined') {
      console.warn(
          'sendAnalyticsEvent() called with no eventAction or ' +
          'eventValue.');
      return;
    }

    let payloadData: {[key: string]: string|number} = {
      // Version Number
      v: 1,
      // Client ID
      cid: clientId,
      // Tracking ID
      tid: this.trackingId,
      // Hit Type
      t: 'event',
      // Data Source
      ds: 'serviceworker',
      // Event Category
      ec: 'serviceworker',
      // Event Action
      ea: eventAction,
      // Event Value
      ev: eventValue,
    };

    if (optionalParams) {
      payloadData = Object.assign(payloadData, optionalParams);
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

    const response = await fetch('https://www.google-analytics.com/collect', {
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
