export class DashPollController {
  private pollConfigs:
      {[id: string]: {timeoutId: number|null; cb: Function; duration: number;}};

  constructor() {
    this.pollConfigs = {};
  }

  private async runPollEvent(id: string) {
    try {
      await this.pollConfigs[id].cb();
    } catch (err) {
      console.warn('Dash poll event threw an error.');
      console.warn(err);
    }
    this.setupNextPoll(id);
  }

  private async setupNextPoll(id: string) {
    this.clearTimeout(id);
    this.pollConfigs[id].timeoutId = window.setTimeout(
        () => this.runPollEvent(id),
        this.pollConfigs[id].duration,
    );
  }

  private clearTimeout(id: string) {
    const prevTimeoutId = this.pollConfigs[id].timeoutId;
    if (prevTimeoutId !== null) {
      window.clearTimeout(prevTimeoutId);
    }
  }

  startPoll(id: string, cb: Function, duration: number) {
    if (this.pollConfigs[id]) {
      throw new Error(`Poll with id '${id}' is already configured.`);
    }

    this.pollConfigs[id] = {
      timeoutId: null,
      duration,
      cb,
    };

    this.setupNextPoll(id);
  }

  triggerPoll(id: string) {
    if (!this.pollConfigs[id]) {
      throw new Error(`Unknown poll id: '${id}'`);
    }

    this.clearTimeout(id);
    this.runPollEvent(id);
  }
}
