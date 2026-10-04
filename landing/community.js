export const SOCIAL_LINKS = [
  ['X', 'x', 'https://x.com/DlicomApp'],
  ['Telegram', 'telegram', 'https://t.me/dlicom'],
  ['Discord', 'discord', 'https://discord.gg/dlicom'],
  ['YouTube', 'youtube', 'https://www.youtube.com/@DlicomApp'],
  ['LinkedIn', 'linkedin', 'https://www.linkedin.com/company/shlenpower'],
  ['TikTok', 'tiktok', 'https://www.tiktok.com/@dlicomapp'],
  ['Instagram', 'instagram', 'https://www.instagram.com/dlicomapp'],
  ['Reddit', 'reddit', 'https://www.reddit.com/user/DlicomApp/'],
  ['Facebook', 'facebook', 'https://www.facebook.com/DlicomApp'],
  ['Medium', 'medium', 'https://medium.com/@dlicom'],
];
export const STORE_LINKS = [
  ['App Store', 'apple', 'https://apps.apple.com/us/app/dlicom/id6502626332'],
  ['Google Play', 'googleplay', 'https://play.google.com/store/search?q=dlicom&c=apps&hl=en'],
];
export function populateCommunity() {
  const icon = name => `<img src="../assets/ui/socials/${name}.svg" alt="" width="24" height="24" />`;
  document.querySelector('#social-grid').innerHTML = SOCIAL_LINKS.map(([name, slug, url]) =>
    `<a class="social-link" href="${url}" target="_blank" rel="noopener noreferrer" aria-label="Dlicom on ${name} (opens in a new tab)">${icon(slug)}<span>${name}</span></a>`).join('');
  document.querySelector('#app-downloads').innerHTML = STORE_LINKS.map(([name, slug, url]) =>
    `<a class="store-link" href="${url}" target="_blank" rel="noopener noreferrer" aria-label="Get Dlicom on ${name} (opens in a new tab)">${icon(slug)}<span><small>GET THE DLICOM APP</small><strong>${name}</strong></span><b aria-hidden="true">↗</b></a>`).join('');
}
