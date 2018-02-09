interface SubscriptionAPIBody {
  subscription: PushSubscription;
  supportedContentEncodings: string[];
}

async function performAPICall(
    action: 'add'|'remove', subscription: PushSubscription) {
  const encodings = (PushManager as {
                      supportedContentEncodings?: string[]
                    }).supportedContentEncodings;

  const bodyContent: SubscriptionAPIBody = {
    subscription,
    supportedContentEncodings: encodings || [],
  };

  const response = await fetch(`/api/push-subscription/${action}`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(bodyContent),
  });
  if (!response.ok) {
    throw new Error('Server responded with a non-200 response code.');
  }
}

async function addSubscriptionToBackend(subscription: PushSubscription) {
  await performAPICall('add', subscription);
}

async function removeSubscriptionFromBackend(subscription: PushSubscription) {
  await performAPICall('remove', subscription);
}

export {addSubscriptionToBackend};
export {removeSubscriptionFromBackend};
