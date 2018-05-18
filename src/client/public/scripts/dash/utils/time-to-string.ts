export function timeToString(dateTime: number) {
  let secondsSince = (Date.now() - dateTime) / 1000;
  let unit = 'second';
  if (secondsSince > 60) {
    secondsSince = secondsSince / 60;
    unit = 'minute';

    if (secondsSince > 60) {
      secondsSince = secondsSince / 60;
      unit = 'hour';

      if (secondsSince > 24) {
        secondsSince = secondsSince / 24;
        unit = 'day';

        if (secondsSince > 365) {
          secondsSince = secondsSince / 365;
          unit = 'year';
        } else if (secondsSince > 30) {
          secondsSince = secondsSince / 30;
          unit = 'month';
        }
      }
    }
  }

  const timeStr = (secondsSince).toFixed(0);
  if (timeStr !== '1') {
    unit += 's';
  }
  return `${timeStr} ${unit} ago`;
}
