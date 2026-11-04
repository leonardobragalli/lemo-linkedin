// Carica gli asset grafici (font + archivio foto) e genera le tavole dei colleghi.
import { generaSvgCardCollega, generaBannerProfiloCollega, rasterizzaSvgInBlobUrl } from './cards.js';
import { immaginiMatteo, asset } from './util.js';

let assetsPromise = null;
const avatarCache = {};

export function caricaAsset() {
  if (!assetsPromise) {
    assetsPromise = Promise.all([
      fetch(asset('assets/fonts.css')).then(r => r.text()),
      fetch(asset('assets/photo_pool.json')).then(r => r.json()),
    ]).then(([css, pool]) => {
      window.LEMONS_FONTS_CSS = css;
      window.LEMONS_PHOTO_POOL = pool;
    });
  }
  return assetsPromise;
}

async function avatarDataUri(id) {
  if (avatarCache[id]) return avatarCache[id];
  try {
    const blob = await fetch(asset(`avatars/${id}.jpg`)).then(r => (r.ok ? r.blob() : null));
    if (!blob) return '';
    avatarCache[id] = await new Promise(res => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(blob); });
  } catch { avatarCache[id] = ''; }
  return avatarCache[id];
}

// Restituisce [{nome, url, pdf?}] pronte da mostrare/scaricare.
export async function immaginiPost(member, post, idxSlot) {
  if (post.formato === 'testo' || post.origine === 'storico') return [];
  if (member.id === 'matteo' && post.origine === 'piano') return immaginiMatteo(post);
  await caricaAsset();
  const prof = { ...member, avatar: await avatarDataUri(member.id) };
  const pData = {
    id: post.slot || 'N',
    titolo: post.titolo || '',
    tema: post.tema || '',
    fonti: post.fonti || '',
    vis: post.vis || null,
  };
  const key = `${post.id}_${post.updated_at}`;
  const tag = post.slot ? `Post${post.slot}` : 'Post';
  const cov = generaSvgCardCollega(prof, pData, idxSlot, 1, true);
  const dat = generaSvgCardCollega(prof, pData, idxSlot, 2, true);
  const [u1, u2] = await Promise.all([
    rasterizzaSvgInBlobUrl(cov, 2160, 2700, 'image/jpeg', key + '_c'),
    rasterizzaSvgInBlobUrl(dat, 2160, 2700, 'image/png', key + '_i'),
  ]);
  return [
    { nome: `${tag}_1_copertina_UHD.jpg`, url: u1 },
    { nome: `${tag}_2_scheda_UHD.png`, url: u2 },
  ].filter(x => x.url);
}

export async function bannerProfilo(member, variante = 1, lang = 'it') {
  await caricaAsset();
  const prof = { ...member, avatar: await avatarDataUri(member.id) };
  const svg = generaBannerProfiloCollega(prof, variante, lang);
  return rasterizzaSvgInBlobUrl(svg, 4752, 1188, 'image/jpeg', `banner_${member.id}_${variante}_${lang}`);
}
