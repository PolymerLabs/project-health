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
    const tailPath = path.substr(selectedModule.length + 1);
    this.setVisiblePage(selectedModule, tailPath);

    if (!this.loadedModules.includes(selectedModule)) {
      this.loadModule(selectedModule);
    }
  }

  /**
   * Switches the visible page.
   */
  setVisiblePage(selectedModule: string, path: string) {
    for (const element of Array.from(this.children)) {
      if (element.getAttribute('prefix') === selectedModule) {
        element.setAttribute('selected', '');
        element.setAttribute('path', path);
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

customElements.define('app-element', AppElement);
