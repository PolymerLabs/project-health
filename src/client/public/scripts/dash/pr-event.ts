import {html} from '../../../../../node_modules/lit-html/lib/lit-extended.js';
import {TemplateResult} from '../../../../../node_modules/lit-html/lit-html.js';
import * as api from '../../../../types/api.js';
import {timeToString} from './utils/time-to-string.js';

export type EventModel = {
  time: number|null; text: string | TemplateResult; url: string | null;
  classes?: string[];
};

function reviewStateToString(state: api.Review['reviewState']) {
  if (state === 'APPROVED') {
    return 'approved changes';
  } else if (state === 'CHANGES_REQUESTED') {
    return 'requested changes';
  } else if (state === 'COMMENTED') {
    return 'reviewed with comments';
  } else if (state === 'DISMISSED') {
    return 'dismissed review';
  }
  return '';
}

export function parseAsEventModel(event: api.PullRequestEvent): EventModel {
  switch (event.type) {
    case 'OutgoingReviewEvent':
      const authors = event.reviews.map((review) => review.author);
      const latest =
          Math.max(...event.reviews.map((review) => review.createdAt));
      let states = event.reviews.map((review) => review.reviewState);
      states =
          states.filter((value, index, self) => self.indexOf(value) === index);

      let text = '';
      if (states.length === 1) {
        text = `${authors.join(', ')} ${reviewStateToString(states[0])}`;
      } else {
        text += `${authors.join(', ')} reviewed changes`;
      }
      return {text, time: latest, url: null};
    case 'MyReviewEvent':
      return {
        text: `You ${reviewStateToString(event.review.reviewState)}`,
        time: event.review.createdAt,
        url: null,
      };
    case 'NewCommitsEvent':
      return {
        text: `${event.count} new commits +${event.additions} -${
            event.deletions}`,
        time: event.lastPushedAt,
        url: event.url,
      };
    case 'MentionedEvent':
      return {
        text: `You were @mentioned "${event.text}"`,
        time: event.mentionedAt,
        url: event.url
      };
    default:
      const unknown: never = event;
      throw new Error(`Unknown PullRequestEvent: ${unknown}`);
  }
}

export function eventTemplate(event: EventModel) {
  const timeTemplate = (time: number) =>
      html`<time class="pr-event__time" datetime="${
          new Date(time).toISOString()}">${timeToString(time)}</time>`;

  const linkTemplate = (url: string, text: string|TemplateResult) =>
      html`<a class="pr-event__url" href="${url}" target="_blank">${text}</a>`;

  return html`
      <div class$="pr-event ${event.classes ? event.classes.join(' ') : ''}">
        ${
      event.time ? timeTemplate(event.time) :
                   html`<div class="pr-event__time"></div>`}

        <div class="pr-event__bullet">
          <svg width="40" height="100%">
            <circle cx="20.5" cy="6" r="4.5" />
          </svg>
        </div>
        <div class="pr-event__title">
          ${event.url ? linkTemplate(event.url, event.text) : event.text}
        </div>
      </div>`;
}
