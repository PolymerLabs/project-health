import {render} from '../../../../../node_modules/lit-html/lib/lit-extended.js';
import {TemplateResult} from '../../../../../node_modules/lit-html/lit-html.js';

export abstract class BaseElement extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.renderCallback();
  }

  renderCallback() {
    render(this.render(), this);
  }

  abstract render(): TemplateResult;
}
