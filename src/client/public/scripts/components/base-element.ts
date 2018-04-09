import {render} from '../../../../../node_modules/lit-html/lib/lit-extended.js';
import {TemplateResult} from '../../../../../node_modules/lit-html/lit-html.js';

type Debouncer = (task: Function) => Promise<void>;

function createDebouncer(): Debouncer {
  let queued = false;
  return async (task: Function) => {
    if (queued) {
      return;
    }
    queued = true;
    await Promise.resolve();
    queued = false;
    task();
  };
}

export abstract class BaseElement extends HTMLElement {
  private _debouncer: Debouncer;

  constructor() {
    super();
    this._debouncer = createDebouncer();
  }

  connectedCallback() {
    this.renderCallback();
  }

  renderCallback() {
    this._debouncer(() => {
      render(this.render(), this);
    });
  }

  attributeChangedCallback(
      _name: string,
      _oldValue: string|null,
      _newValue: string|null) {
    this.renderCallback();
  }

  abstract render(): TemplateResult;
}
