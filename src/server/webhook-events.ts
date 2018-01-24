import * as express from 'express';

// Triggered when the status of a Git commit changes.
function handleStatus(_request: express.Request, response: express.Response) {
  response.send();
}

// Triggered when a pull request is assigned, unassigned, labeled, unlabeled, opened, edited, closed, reopened, or synchronized
function handlePullRequest(_request: express.Request, response: express.Response) {
  response.send();
}

// Triggered when a pull request review is submitted into a non-pending state, the body is edited, or the review is dismissed.
function handlePullRequestReview(_request: express.Request, response: express.Response) {
  response.send();
}

export {
  handleStatus,
  handlePullRequest,
  handlePullRequestReview,
};