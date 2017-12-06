import {html, render} from '/lit-html/lit-html.js'

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
    <li>
      <div class="header">
        <img src="${pr.author.avatarUrl}">
        <b>${pr.repository.nameWithOwner}</b>
        <a href="${pr.url}">${pr.title}</a>
      </div>
      <div class="footer">
        <span>by <a href="${pr.author.url}">${pr.author.login}</a></span>
        <span>${reviewsTemplate(pr.reviews)}</span>
        <span>${reviewRequestsTemplate(pr.reviewRequests)}</span>
      </div>
    </li>
  `;

  const tmpl = html`
    <style>
      body {
        font-family: sans-serif;
      }
      ul {
        list-style: none;
        padding-left: 0px;
      }
      li {
        margin: 16px;
      }
      .header {
        display: flex;
        align-items: center;
      }
      .header > * {
        margin-right: 1ch;
      }
      img {
        width: 30px;
        border-radius: 2px;
      }
    </style>
    <h3>Outgoing pull requests</h3>
    <ul>
      ${json.viewer.pullRequests.nodes.map(pullRequestTemplate)}
    </ul>

    <h3>Incoming rewiew requests</h3>
    ${json.incomingReviews.nodes.map(pullRequestTemplate)}

    <h3>Raw data</h3>
    <pre>${JSON.stringify(json, null, 2)}</pre>
  `;
  render(tmpl, document.body);
}

start();
