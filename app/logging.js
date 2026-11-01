export function formatPumpLog(action, speed, time = new Date()) {
  if (!['started', 'stopped'].includes(action)) throw new Error('Unknown pump action');
  if (!Number.isFinite(speed) || speed < 0) throw new Error('Invalid pump speed');
  return `Pump ${action} at ${speed} mL/min`;
}
