export const TAG_COLORS = [
  { bg: '#e8f5e9', text: '#2e7d32' },
  { bg: '#e3f2fd', text: '#1565c0' },
  { bg: '#fff3e0', text: '#e65100' },
  { bg: '#f3e5f5', text: '#7b1fa2' },
  { bg: '#e0f2f1', text: '#00695c' },
  { bg: '#fce4ec', text: '#c62828' },
  { bg: '#fff8e1', text: '#f57f17' },
  { bg: '#e8eaf6', text: '#283593' },
  { bg: '#efebe9', text: '#4e342e' },
  { bg: '#f1f8e9', text: '#33691e' },
];

export function getTagColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
}
