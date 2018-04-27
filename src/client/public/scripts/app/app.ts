import './router.js';
import '../components/nav-element.js';

/**
 * Manages pages within the app.
 */
class AppElement extends HTMLElement {
  private modules: string[] = [];
  private loadedModules: string[] = [];

  connectedCallback() {
    document.body.addEventListener('url-changed', this.updatePage.bind(this));
    for (const element of Array.from(this.children)) {
      const prefix = element.getAttribute('prefix');
      if (prefix) {
        this.modules.push(prefix);
      } else {
        console.error('Page prefix missing:', element);
      }
    }

    // Initial load.
    this.updatePage();
  }

  /**
   * Load the correct page based on the path.
   */
  updatePage() {
    // Remove leading /
    const path = window.location.pathname.substring(1);
    let selectedModule = 'dash';
    for (const prefix of this.modules) {
      if (path.startsWith(prefix)) {
        selectedModule = prefix;
      }
    }

    // Strip any leading slash.
    const urlParams = path.substr(selectedModule.length + 1);
    this.setVisiblePage(selectedModule, urlParams);

    if (!this.loadedModules.includes(selectedModule)) {
      this.loadModule(selectedModule);
    }
  }

  /**
   * Switches the visible page.
   */
  setVisiblePage(selectedModule: string, urlParams: string) {
    for (const element of Array.from(this.children)) {
      if (element.getAttribute('prefix') === selectedModule) {
        element.setAttribute('selected', '');
        element.setAttribute('urlparams', urlParams);
      } else {
        element.removeAttribute('selected');
      }
    }
  }

  /**
   * Lazily loads the requested module.
   */
  async loadModule(module: string) {
    const moduleSpecifier = `/scripts/pages/${module}.js`;
    if (supportsDynamicImport) {
      // eval() prevents browsers which don't support dynamic import from
      // breaking.
      eval(`import('${moduleSpecifier}')`);
    } else {
      const script = document.createElement('script');
      script.src = `/bundled/scripts/pages/${module}.js`;
      document.head.appendChild(script);
    }
  }
}

const supportsDynamicImport = (() => {
  try {
    // tslint:disable-next-line:no-unused-expression
    new Function('import("")');
    return true;
  } catch (err) {
    return false;
  }
})();

// Wrap customElements.define with a check to ensure we don't double-register
// anything.
const originalDefine = customElements.define.bind(customElements);
function wrappedCustomElementsDefine(
    name: string,
    constructor: Function,
    options?: ElementDefinitionOptions|undefined) {
  if (!customElements.get(name)) {
    originalDefine(name, constructor, options);
  }
}

customElements.define = wrappedCustomElementsDefine;

customElements.define('app-element', AppElement);
