function svg(paths) {
  return `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths}</svg>`;
}

export function iconCasa() {
  return svg('<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v9a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1v-9"/><path d="M9.5 20v-6h5v6"/>');
}

export function iconBilancia() {
  return svg('<rect x="3.5" y="3.5" width="17" height="17" rx="3"/><circle cx="12" cy="12" r="3.5"/><path d="M12 9.5v2.5l1.6 1.6"/>');
}

export function iconForchetta() {
  return svg('<path d="M7 3v7a2 2 0 0 0 2 2v9"/><path d="M7 3v4M9 3v4M11 3v7"/><path d="M17 3c-1.5 0-2.5 1.8-2.5 4.5S15.5 12 17 12v9"/>');
}

export function iconManubrio() {
  return svg('<path d="M4 10v4"/><path d="M2.5 9.5v5"/><rect x="6" y="8" width="3" height="8" rx="1"/><path d="M9 12h6"/><rect x="15" y="8" width="3" height="8" rx="1"/><path d="M20 10v4"/><path d="M21.5 9.5v5"/>');
}

export function iconGrafico() {
  return svg('<path d="M3 20h18"/><path d="M3 20V4"/><path d="M6 15l4-4 3 3 6-7"/><path d="M15 7h4v4"/>');
}

export function iconSpunta() {
  return svg('<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.5 2.5L16 9.5"/>');
}
