export const fmtTime = (t) => (t ? new Date(t).toLocaleTimeString() : '-');
export const fmtSpeed = (s) => (s == null ? '-' : `${Math.round(s)} km/h`);
