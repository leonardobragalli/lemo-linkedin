// Tre versioni grafiche per le bozze AI: stile vecchio (tavole del kit), nuovo Friendly, nuovo Scientifico.
// «Rigenera grafica» chiede all'AI nuovi testi per le grafiche (tutti e tre gli stili cambiano insieme);
// le versioni precedenti restano e si sfogliano con ← →. Ognuno sceglie quali stili vedere (preferenza salvata nel profilo).
import { useEffect, useState } from 'react';
import { supabase, supabaseUrl } from '../supabase.js';
import { grafichePost, pdfDaImmagini } from '../lib/graficaNuova.js';
import { scaricaUrl } from '../lib/util.js';

const MODELLI = [['frase', 'Frase'], ['numero', 'Numero'], ['carosello', 'Carosello'], ['foto', 'Foto (carica una foto)']];
const STILI = [['vecchio', 'Stile vecchio'], ['friendly', 'Nuovo · Friendly'], ['scientifico', 'Nuovo · Scientifico']];
const TUTTI = { vecchio: true, friendly: true, scientifico: true };

function prefIniziali(me) {
  const db = me?.preferenze?.stili;
  if (db) return { ...TUTTI, ...db };
  try { return { ...TUTTI, ...JSON.parse(localStorage.getItem('lemo-stili-' + me?.id) || '{}') }; } catch { return TUTTI; }
}

export default function Grafiche({ post, vecchie, onScelta, me, applica, puo, primaSalva }) {
  const g = post.vis?.grafica || {};
  const versioni = post.vis?.versioni?.length ? post.vis.versioni : [g];
  const idxAttuale = Math.max(0, versioni.findIndex(v => JSON.stringify(v) === JSON.stringify(g)));
  const [stili, setStili] = useState(() => prefIniziali(me));
  const visibili = STILI.filter(([k]) => stili[k]);
  const [scelta, setScelta] = useState(() => (g.stile === 'scientifico' ? 'scientifico' : 'friendly'));
  const [modello, setModello] = useState(g.modello || 'frase');
  const [foto, setFoto] = useState(null);
  const [chiusura, setChiusura] = useState(true);
  const [nuove, setNuove] = useState({ friendly: null, scientifico: null });
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const [pref, setPref] = useState(false);

  // se lo stile scelto è nascosto, passa al primo visibile
  useEffect(() => { if (!stili[scelta] && visibili.length) setScelta(visibili[0][0]); }, [stili]); // eslint-disable-line
  useEffect(() => { if (g.modello) setModello(g.modello); }, [post.updated_at]); // eslint-disable-line

  useEffect(() => {
    let vivo = true;
    setNuove({ friendly: null, scientifico: null }); setErr(null);
    (async () => {
      try {
        const r = {};
        for (const st of ['friendly', 'scientifico']) {
          if (!stili[st]) continue;
          const { modello: m, immagini } = await grafichePost(post, { stile: st, modello, foto, conChiusura: chiusura });
          if (m === 'carosello' && immagini.length > 1) immagini.push(await pdfDaImmagini(immagini));
          r[st] = { m, immagini };
        }
        if (vivo) setNuove(r);
      } catch (e) { if (vivo) setErr(String(e?.message || e)); }
    })();
    return () => { vivo = false; };
  }, [post.id, post.updated_at, modello, foto, chiusura, stili.friendly, stili.scientifico]); // eslint-disable-line

  const lista = !stili[scelta] ? [] : scelta === 'vecchio' ? vecchie : nuove[scelta]?.immagini;
  useEffect(() => { onScelta?.(lista || null); }, [lista]); // eslint-disable-line

  function caricaFoto(e) {
    const f = e.target.files?.[0]; if (!f) return;
    const im = new Image(); im.onload = () => { setFoto(im); setModello('foto'); }; im.src = URL.createObjectURL(f);
  }
  async function rigenera() {
    setBusy(true); setErr(null);
    // il testo corretto e non ancora salvato va salvato prima: la grafica nuova si basa sul testo nel database
    if (primaSalva && !(await primaSalva())) { setBusy(false); return; }
    const { data: s } = await supabase.auth.getSession();
    const r = await fetch(`${supabaseUrl}/functions/v1/genera-bozza`, {
      method: 'POST', headers: { Authorization: 'Bearer ' + s.session.access_token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ azione: 'grafica', post_id: post.id, modello: modello === 'foto' ? undefined : modello }),
    });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) { setErr(j.error || `Errore ${r.status}`); return; }
    applica('posts', j.post);
  }
  async function vaiVersione(i) {
    const v = versioni[i]; if (!v) return;
    const vis = { ...post.vis, grafica: v, titolo: v.titolo, sottotitolo: v.sottotitolo || '', punti: (v.slide || []).map(x => x.titolo).concat(['', '', '']).slice(0, Math.max(3, (v.slide || []).length)), metrica_val: v.numero || '', metrica_lbl: v.etichetta_numero || '', citazione: v.fonte_breve || '' };
    const { data, error } = await supabase.from('posts').update({ vis }).eq('id', post.id).select().single();
    if (error) setErr(error.message); else applica('posts', data);
  }
  async function cambiaStile(k, v) {
    const nuovo = { ...stili, [k]: v };
    if (!Object.values(nuovo).some(Boolean)) return;   // almeno uno stile resta acceso
    setStili(nuovo);
    try { localStorage.setItem('lemo-stili-' + me.id, JSON.stringify(nuovo)); } catch { /* niente */ }
    const { error } = await supabase.from('team_members').update({ preferenze: { ...(me.preferenze || {}), stili: nuovo } }).eq('id', me.id);
    if (!error) me.preferenze = { ...(me.preferenze || {}), stili: nuovo };
  }
  const ripiego = nuove[scelta] && nuove[scelta].m !== modello;

  return (
    <div className="card" style={{ margin: 0 }}>
      <div className="row tight" style={{ flexWrap: 'wrap' }}>
        <b>Grafica</b>
        {visibili.map(([k, l]) => (
          <button key={k} className={'btn xs ' + (scelta === k ? '' : 'ghost')} onClick={() => setScelta(k)}>{l}{g.stile === k ? ' ★' : ''}</button>
        ))}
        <div className="sp" />
        <button className="btn ghost xs" onClick={() => setPref(!pref)} title="Scegli quali stili vedere">⚙ stili</button>
      </div>
      {pref && (
        <div className="row tight small" style={{ marginTop: 6, flexWrap: 'wrap' }}>
          <span className="muted">Mostra (vale per il tuo account):</span>
          {STILI.map(([k, l]) => <label key={k} className="chk"><input type="checkbox" checked={!!stili[k]} onChange={e => cambiaStile(k, e.target.checked)} /> {l}</label>)}
        </div>
      )}
      <div className="row tight" style={{ marginTop: 6, flexWrap: 'wrap' }}>
        {puo && <button className="btn orange xs" disabled={busy} onClick={rigenera}>{busy ? 'Rigenero… (5-15 s)' : '🔄 Rigenera grafica'}</button>}
        {versioni.length > 1 && <span className="small">
          <button className="btn ghost xs" disabled={!puo || idxAttuale <= 0} onClick={() => vaiVersione(idxAttuale - 1)}>←</button>
          {' '}versione {idxAttuale + 1} di {versioni.length}{' '}
          <button className="btn ghost xs" disabled={!puo || idxAttuale >= versioni.length - 1} onClick={() => vaiVersione(idxAttuale + 1)}>→</button>
        </span>}
        {scelta !== 'vecchio' && <>
          <label className="small">Modello <select value={modello} onChange={e => setModello(e.target.value)}>
            {MODELLI.map(([k, l]) => <option key={k} value={k}>{l}{g.modello === k ? ' (proposto)' : ''}</option>)}
          </select></label>
          <label className="small">Foto <input type="file" accept="image/*" onChange={caricaFoto} /></label>
          {modello === 'carosello' && <label className="chk small"><input type="checkbox" checked={chiusura} onChange={e => setChiusura(e.target.checked)} /> slide finale «commenti» (facoltativa)</label>}
        </>}
      </div>
      <p className="small muted" style={{ margin: '6px 0' }}>
        ★ = stile proposto dall'AI. «Rigenera» cambia i testi della grafica in tutti gli stili; le versioni precedenti restano. Quando premi «Copia testo + scarica immagini» viene usato lo stile selezionato.
        {ripiego && scelta !== 'vecchio' && <> Modello «{modello}» non possibile con questa versione (manca {modello === 'numero' ? 'un numero con fonte' : modello === 'carosello' ? 'l\'elenco di slide: prova «Rigenera»' : 'la foto'}): uso «{nuove[scelta]?.m}».</>}
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
