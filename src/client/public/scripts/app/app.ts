import './router.js';
import '../dash/dash.js';

/**
 * Manages pages within the app.
 */
class AppElement extends HTMLElement {
  private modules: string[] = [];
  private loadedModules: string[] = [];

  connectedCallback() {
    document.body.addEventListener('url-changed', this.updatePage.bind(this));
    for (const element of Array.from(this.children)) {
      this.modules.push(element.id);
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
    let module = 'dash';
    if (this.modules.includes(path)) {
      module = path;
    }
    this.setVisiblePage(module);

    if (!this.loadedModules.includes(module)) {
      this.loadModule(module);
    }
  }

  /**
   * Switches the visible page.
   */
  setVisiblePage(module: string) {
    for (const element of Array.from(this.children)) {
      if (element.id === module) {
        element.setAttribute('selected', '');
      } else {
        element.removeAttribute('selected');
      }
    }
  }

  /**
   * Lazily loads the requested module.
   */
  loadModule(_module: string) {
    // TODO(samli): This is disabled till these pages are implemented.
    // const moduleSpecifier = `/scripts/pages/${module}.js`;
    // import(moduleSpecifier);
  }
}

customElements.define('app-element', AppElement);
