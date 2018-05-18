async function handleFailingStatus(
    hookData: StatusHook,
    prDetails: PullRequestDetails,
    savedCommitDetails: CommitDetails|null): Promise<WebHookHandleResponse> {
  const webhookResponse: WebHookHandleResponse = {
    handled: false,
    notifications: null,
    message: null,
  };

  if (!savedCommitDetails || savedCommitDetails.status !== hookData.state) {
    webhookResponse.handled = true;

    const repo = hookData.repository;

    const results = await sendNotification(prDetails.author, {
      title: hookData.description,
      body: `[${hookData.repository.name}] ${prDetails.title}`,
      requireInteraction: false,
      icon: '/images/notification-images/icon-error-192x192.png',
      data: {
        url: prDetails.url,
        pullRequest: {
          gqlId: prDetails.gqlId,
        },
      },
      tag: getPRTag(repo.owner.login, repo.name, prDetails.number),
    });
    webhookResponse.notifications = results;
  } else {
    webhookResponse.message = 'The previous commit details and the hook ' +
        'details are the same state.';
  }

  return webhookResponse;
}
