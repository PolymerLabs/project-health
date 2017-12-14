import {html, render} from 'lit-html/lit-html.js'

async function start() {
  const queryParams = new URLSearchParams(window.location.search);
  const endpoint = queryParams.has('test') ? '/test-dash.json' : '/dash.json';
  const res = await fetch(endpoint, {credentials: 'include'});
  const json = await res.json();

  const authorTemplate = (author) => html`
    <a href="${author.url}">${author.login}</a>
  `;

  // TODO: review requests can be less than totalCount.
  const reviewRequestsTemplate = (requests) => html`
    ${
      requests.totalCount > 0 ?
      html
  `waiting on ${
      requests.nodes.map(
          (request) => authorTemplate(request.requestedReviewer))}`: ``}
  `;

  const reviewTemplate = (review) => html`
    ${review.state.toLowerCase()} by ${authorTemplate(review.author)}
  `;

  // TODO: number of reviews can be less than totalCount.
  const reviewsTemplate = (reviews) => html`
    ${reviews.nodes.map(reviewTemplate)}
  `;

  const pullRequestTemplate = (pr) => html`
    <div class="pr">
      <img class="avatar" src="${pr.author.avatarUrl}">
      <div class="item-contents">
        <div class="header">
          ${pr.repository.nameWithOwner} <b>${pr.title}</b> ${pr.number}
        </div>
        <div class="footer">
          <div>
            <span>${reviewsTemplate(pr.reviews)}</span>
            <span>${reviewRequestsTemplate(pr.reviewRequests)}</span>
          </div>
          <div>
            <span>by <a href="${pr.author.url}">${pr.author.login}</a></span>
          </div>
        </div>
      </div>
    </div>
  `;

  const tmpl = html`
    <style>
      body {
        font-family: Helvetica, Arial, sans-serif;
        font-size: 14pt;
      }
      .pr {
        padding: 12px;
        height: 68px;
        display: flex;
      }
      .avatar {
        width: 52px;
        height: 52px;
        border: 4px solid #26A745;
        border-radius: 50%;
        margin-right: 16px;
      }
      .item-contents {
        display: flex;
        flex-direction: column;
      }

      .header {
        font-size: 18px;
        margin-bottom: 4px;
      }

      .footer {
        font-size: 16px;
        line-height: 22px;
      }
    </style>
    ${json.viewer.pullRequests.nodes.map(pullRequestTemplate)}
    ${json.incomingReviews.nodes.map(pullRequestTemplate)}
  `;
  render(tmpl, document.body);
}

start();
