// Tre versioni grafiche per le bozze AI: stile vecchio (tavole del kit), nuovo Friendly, nuovo Scientifico.
// Si sceglie quale usare per la pubblicazione; le altre restano scaricabili.
import { useEffect, useState } from 'react';
import { grafichePost, pdfDaImmagini } from '../lib/graficaNuova.js';
import { scaricaUrl } from '../lib/util.js';

const MODELLI = [['frase', 'Frase'], ['numero', 'Numero'], ['carosello', 'Carosello'], ['foto', 'Foto (carica una foto)']];

export default function Grafiche({ post, vecchie, onScelta }) {
  const g = post.vis?.grafica || {};
  const [scelta, setScelta] = useState(() => (g.stile === 'scientifico' ? 'scientifico' : 'friendly'));
  const [modello, setModello] = useState(g.modello || 'frase');
  const [foto, setFoto] = useState(null);
  const [chiusura, setChiusura] = useState(true);
  const [nuove, setNuove] = useState({ friendly: null, scientifico: null });
  const [err, setErr] = useState(null);

  useEffect(() => {
    let vivo = true;
    setNuove({ friendly: null, scientifico: null }); setErr(null);
    (async () => {
      try {
        const r = {};
        for (const st of ['friendly', 'scientifico']) {
          const { modello: m, immagini } = await grafichePost(post, { stile: st, modello, foto, conChiusura: chiusura });
          if (m === 'carosello' && immagini.length > 1) immagini.push(await pdfDaImmagini(immagini));
          r[st] = { m, immagini };
        }
        if (vivo) setNuove(r);
      } catch (e) { if (vivo) setErr(String(e?.message || e)); }
    })();
    return () => { vivo = false; };
  }, [post.id, post.updated_at, modello, foto, chiusura]); // eslint-disable-line

  const lista = scelta === 'vecchio' ? vecchie : nuove[scelta]?.immagini;
  useEffect(() => { onScelta?.(lista || null); }, [lista]); // eslint-disable-line

  function caricaFoto(e) {
    const f = e.target.files?.[0]; if (!f) return;
    const im = new Image(); im.onload = () => { setFoto(im); setModello('foto'); }; im.src = URL.createObjectURL(f);
  }
  const ripiego = nuove.friendly && nuove.friendly.m !== modello;

  return (
    <div className="card" style={{ margin: 0 }}>
      <div className="row tight" style={{ flexWrap: 'wrap' }}>
        <b>Grafica</b>
        {[['vecchio', 'Stile vecchio'], ['friendly', 'Nuovo · Friendly'], ['scientifico', 'Nuovo · Scientifico']].map(([k, l]) => (
          <button key={k} className={'btn xs ' + (scelta === k ? '' : 'ghost')} onClick={() => setScelta(k)}>{l}{g.stile === k ? ' ★' : ''}</button>
        ))}
      </div>
      {scelta !== 'vecchio' && (
        <div className="row tight" style={{ marginTop: 6, flexWrap: 'wrap' }}>
          <label className="small">Modello <select value={modello} onChange={e => setModello(e.target.value)}>
            {MODELLI.map(([k, l]) => <option key={k} value={k}>{l}{g.modello === k ? ' (proposto)' : ''}</option>)}
          </select></label>
          <label className="small">Foto <input type="file" accept="image/*" onChange={caricaFoto} /></label>
          {modello === 'carosello' && <label className="chk small"><input type="checkbox" checked={chiusura} onChange={e => setChiusura(e.target.checked)} /> slide finale «commenti» (facoltativa)</label>}
        </div>
      )}
      <p className="small muted" style={{ margin: '6px 0' }}>
        ★ = stile proposto dall'AI. Viene usato quello selezionato quando premi «Copia testo + scarica immagini». Nessun nome o foto dell'autore nelle grafiche.
        {ripiego && scelta !== 'vecchio' && <> Modello «{modello}» non possibile con questa bozza (manca {modello === 'numero' ? 'un numero con fonte' : modello === 'carosello' ? 'l\'elenco di slide' : 'la foto'}): uso «{nuove[scelta]?.m}».</>}
        {scelta === 'scientifico' && modello === 'foto' && <> La foto è prevista solo nello stile Friendly.</>}
      </p>
      {err && <p className="errtxt small">{err}</p>}
      <div className="imgs">
        {!lista && !err && <div className="muted small">Genero le immagini…</div>}
        {lista && lista.length === 0 && <div className="muted small">Nessuna immagine per questo formato.</div>}
        {lista && lista.map(im => (
          <div key={im.nome} className="img">
            {im.pdf ? <div className="pdf">PDF carosello</div> : <img src={im.url} alt={im.nome} loading="lazy" />}
            <button className="btn ghost xs" onClick={() => scaricaUrl(im.url, im.nome)}>↓ {im.nome}</button>
          </div>
        ))}
      </div>
    </div>
  );
}
