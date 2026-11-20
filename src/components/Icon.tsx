const paths = {
  briefcase: <><rect x="2.5" y="7" width="19" height="13" rx="3"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12c5 3 13 3 18 0"/></>,
  book: <><path d="M12 6c-3-2-7-2-10-1v14c3-1 7-1 10 1 3-2 7-2 10-1V5c-3-1-7-1-10 1Zm0 0v14"/></>,
  photos: <><rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="8" cy="9" r="1.5"/><path d="m4 18 5-5 3 3 4-6 5 7"/></>,
  music: <><path d="M9 17V6l11-3v12M9 9l11-3"/><ellipse cx="6" cy="18" rx="3" ry="2.5"/><ellipse cx="17" cy="16" rx="3" ry="2.5"/></>,
  globe: <><circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4.2" ry="9"/><path d="M3 12h18"/></>,
  arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
  external: <path d="M6 18 18 6M7 6h11v11" />,
  expand: <path d="M4 9V4h5m6 0h5v5M4 15v5h5m6 0h5v-5" />,
  moon: <path d="M18.5 15.8A8 8 0 0 1 8.2 5.5 8.2 8.2 0 1 0 18.5 15.8Z" />,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M19 5l-1.5 1.5m-11 11L5 19" /></>,
  pin: <><path d="M19 10c0 5-7 11-7 11s-7-6-7-11a7 7 0 1 1 14 0Z" /><circle cx="12" cy="10" r="2" /></>,
  info: <><circle cx="12" cy="12" r="8.5"/><path d="M12 11v5m0-9v1"/></>,
}
export function Icon({ name }: { name: keyof typeof paths }) {
  return <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>
}
