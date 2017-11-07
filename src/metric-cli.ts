import * as commandLineArgs from 'command-line-args';
import reviewLatency from './metrics/review-latency';

const argDefs = [
  {name: 'metric', type: String, description: 'Name of the metric to measure'},
  {
    name: 'raw',
    type: Boolean,
    defaultValue: false,
    description: 'Dumps the raw data relevant to the provided metric',
  },
  {
    name: 'org',
    type: String,
    description: 'Name of the GitHub org to measure',
  },

];

export function run(argv: string[]) {
  const args = commandLineArgs(argDefs, {argv});

  if (!args.metric) {
    throw new Error('No metric specified');
  }

  if (!args.org) {
    throw new Error('No GitHub org specified');
  }

  if (args.metric == 'review-latency') {
    reviewLatency(args);
  }
}
