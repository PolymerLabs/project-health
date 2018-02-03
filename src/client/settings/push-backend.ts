interface SubscriptionAPIBody {
  subscription: PushSubscription;
  supportedContentEncodings: string[];
}

async function performAPICall(action: 'add' | 'remove', subscription: PushSubscription) {
  const encodings = (PushManager as {
    supportedContentEncodings?: string[]}).supportedContentEncodings;

  const bodyContent: SubscriptionAPIBody = {
    subscription,
    supportedContentEncodings: encodings || [],
  }; 

  await fetch(`/api/push-subscription/${action}`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(bodyContent),
  });
}

async function addSubscriptionToBackend(subscription: PushSubscription) {
  await performAPICall('add', subscription);
};

async function removeSubscriptionFromBackend(subscription: PushSubscription) {
  await performAPICall('remove', subscription);
}

export {addSubscriptionToBackend};
export {removeSubscriptionFromBackend};
