export abstract class MetricResult {
  /**
   * Prints a summary of the metric results
   */
  abstract logSummary(): void;

  /**
   * Prints a more verbose set of data used for the Metric results
   */
  abstract logRawData(): void;
}
