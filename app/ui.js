import { station } from './config.js';
import { formatPumpLog } from './logging.js';

document.querySelector('#valveLabel').textContent = station.valveLabel;
document.querySelector('#valveDescription').textContent = station.valveDescription;
let valveOpen = false;
let pumpRunning = false;
const log = [];
document.querySelector('#valveToggle').addEventListener('click', event => {
  valveOpen = !valveOpen;
  event.currentTarget.textContent = valveOpen ? 'Close valve' : 'Open valve';
  document.querySelector('#valveState').textContent = valveOpen ? 'Open' : 'Closed';
});
document.querySelector('#pumpToggle').addEventListener('click', event => {
  pumpRunning = !pumpRunning;
  event.currentTarget.textContent = pumpRunning ? 'Stop pump' : 'Start pump';
  document.querySelector('#pumpState').textContent = pumpRunning ? 'Running' : 'Stopped';
  log.push(formatPumpLog(pumpRunning ? 'started' : 'stopped', station.pumpSpeed));
});
document.querySelector('#downloadLog').addEventListener('click', () => {
  const url = URL.createObjectURL(new Blob([`${log.join('\n')}\n`], { type: 'text/plain' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'station-01-activity.txt';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  document.querySelector('#announcement').textContent = 'Activity log downloaded.';
});
