import {DashResponse, PullRequest} from '../../api';
import {html, render} from '../lit-html/lit-html.js'

async function start() {
  const queryParams = new URLSearchParams(window.location.search);
  const endpoint = queryParams.has('test') ? '/test-dash.json' : '/dash.json';
  const res = await fetch(endpoint, {credentials: 'include'});
  const json = await res.json() as DashResponse;

  const pullRequestTemplate = (pr: PullRequest) => html`
    <div class="pr">
      <img class="avatar" src="${pr.avatarUrl}">
      <div class="item-contents">
        <div class="header">
          ${pr.repository} <b>${pr.title}</b> ${pr.number}
        </div>
        <div class="footer">
          <div>
            <span>Approved by people</span>
            <span>Maybe</span>
          </div>
          <div>
            <span>by <a href="#">nobody</a></span>
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
    ${json.prs.map(pullRequestTemplate)}
  `;
  render(tmpl, document.body);
}

start();
