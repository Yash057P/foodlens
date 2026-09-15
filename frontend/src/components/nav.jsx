const ICON_PROPS = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.9,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

export const NAV_ITEMS = [
  {
    id: 'scan',
    labelKey: 'navScan',
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M14 4h4a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h2l2-3h6z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
  },
  {
    id: 'history',
    labelKey: 'navHistory',
    icon: (
      <svg {...ICON_PROPS}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 3" />
      </svg>
    ),
  },
  {
    id: 'settings',
    labelKey: 'navSettings',
    icon: (
      <svg {...ICON_PROPS}>
        <line x1="3" y1="6" x2="21" y2="6" />
        <path d="M17 6v-1a1 1 0 0 0-1-1h-6a1 1 0 0 0-1 1v1" />
        <line x1="3" y1="12" x2="21" y2="12" />
        <path d="M15 12v-1a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v1" />
        <line x1="3" y1="18" x2="21" y2="18" />
        <path d="M13 18v1a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-1" />
      </svg>
    ),
  },
  {
    id: 'about',
    labelKey: 'navAbout',
    icon: (
      <svg {...ICON_PROPS}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 16v-4m0-4h.01" />
      </svg>
    ),
  },
]