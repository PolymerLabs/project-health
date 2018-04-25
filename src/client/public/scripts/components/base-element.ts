import {render as litRender} from '../../../../../node_modules/lit-html/lib/lit-extended.js';
import {TemplateResult} from '../../../../../node_modules/lit-html/lit-html.js';

type Debouncer = (task: Function) => Promise<void>;

export abstract class BaseElement extends HTMLElement {
  private _debouncer: Debouncer = createDebouncer();

  constructor() {
    super();
  }

  connectedCallback() {
    this.requestRender();
  }

  requestRender() {
    this._debouncer(() => {
      litRender(this.render(), this);
      this.afterRender();
    });
  }

  attributeChangedCallback(
      name: string,
      oldValue: string|null,
      newValue: string|null) {
    // Prevent unnecessary changes.
    if (oldValue === newValue) {
      return;
    }
    // Set the property corresponding to this attribute.
    // tslint:disable-next-line:no-any
    (this as any)[name] = newValue;
    this.requestRender();
  }

  toggleAttribute(name: string) {
    if (this.hasAttribute(name)) {
      this.removeAttribute(name);
    } else {
      this.setAttribute(name, '');
    }
  }

  abstract render(): TemplateResult;

  // This is called immediately after the render has completed.
  afterRender() {
  }
}

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

export interface PropertyOptions {
  /* The attribute option synchronizes the property to an attribute and vice
   * versa. */
  attribute?: boolean;
}

interface ValueBag {
  [key: string]: {};
}

/**
 * Property decorator which re-renders when there are property changes.
 */
export function property(opts?: PropertyOptions) {
  return function propertyDecorator(
      proto: BaseElement, propertyKey: string): void {
    const innerPropertyKey = `_${propertyKey}`;
    Object.defineProperty(proto, propertyKey, {
      get(this: typeof proto&ValueBag) {
        return this[innerPropertyKey];
      },

      set(this: typeof proto&ValueBag, value: {}) {
        if (this[innerPropertyKey] === value) {
          return;
        }

        this[innerPropertyKey] = value;
        // Reflect the property change to the attribute.
        if (opts && opts.attribute) {
          this.setAttribute(propertyKey, value as string);
        }
        this.requestRender();
      },
    });

    // Set up custom element attribute mutation observers.
    const ctor = proto.constructor as {observedAttributes?: string[]};
    if (opts && opts.attribute) {
      if (!ctor.hasOwnProperty('observedAttributes')) {
        ctor.observedAttributes = [propertyKey];
      } else {
        ctor.observedAttributes!.push(propertyKey);
      }
    }
  };
}
