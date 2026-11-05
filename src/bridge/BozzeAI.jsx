// Scheda «Bozze AI» dentro il Pannello: genera una bozza (Gemini + dati + Lemons Insights)
// e la mette in uno slot del calendario del Pannello, oppure la apre nell'editor completo.
import { useEffect, useMemo, useState } from 'react';
import { supabase, supabaseUrl } from '../supabase.js';
import { normalizzaTestoPuro, primaRiga, fmtData } from '../lib/util.js';

const P = () => window.__lemoPannello;

function conGancio(post, i) {
  const g = (post.ganci_opzioni || [])[i];
  if (!g?.uni) return post.testo || '';
  const righe = normalizzaTestoPuro(post.testo || '').split('\n');
  return g.uni + '\n' + righe.slice(2).join('\n');
}

export default function BozzeAI({ members, posts, me, apri, applica }) {
  const [chi, setChi] = useState(() => P()?.profiloAttivo() || me.id);
  const [gen, setGen] = useState({ tema: '', istruzioni: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  // segue il profilo scelto nel Pannello quando si entra nella scheda
  useEffect(() => {
    const pane = document.getElementById('tab-ai');
    if (!pane) return;
    const segui = () => { if (pane.classList.contains('active')) { const a = P()?.profiloAttivo(); if (a) setChi(a); } };
    const mo = new MutationObserver(segui);
    mo.observe(pane, { attributes: true, attributeFilter: ['class'] });
    return () => mo.disconnect();
  }, []);

  const puo = chi === me.id || me.is_admin;
  const bozze = useMemo(() => posts.filter(p => p.member_id === chi && p.testo_generato && p.stato !== 'scartato')
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1)), [posts, chi]);

  async function genera() {
    setBusy(true); setErr(null);
    const { data: s } = await supabase.auth.getSession();
    const r = await fetch(`${supabaseUrl}/functions/v1/genera-bozza`, {
      method: 'POST', headers: { Authorization: 'Bearer ' + s.session.access_token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ member_id: chi, tema: gen.tema, istruzioni: gen.istruzioni }),
    });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) { setErr(j.error || `Errore ${r.status}`); return; }
    applica('posts', j.post);
    setGen({ tema: '', istruzioni: '' });
  }

  const nome = members.find(m => m.id === chi)?.nome || chi;
  return (
    <div>
      <div className="toolbar">
        <h2>Bozze AI</h2>
        <select value={chi} onChange={e => setChi(e.target.value)}>
          {members.map(m => <option key={m.id} value={m.id}>{m.id === me.id ? `${m.nome} (tu)` : m.nome}</option>)}
        </select>
      </div>

      <div className="card">
        <h3>Nuova bozza per {nome}</h3>
        <p className="small muted">Gemini scrive nella voce dell'autore usando le regole imparate dai dati, i post che hanno reso di più e gli studi di Lemons Insights.
          Ogni numero o affermazione senza fonte viene segnato <b>DA VERIFICARE</b>. Poi la metti in uno slot del calendario e la rifinisci lì come qualsiasi altro post.</p>
        {puo ? (
          <>
            <label>Tema (facoltativo) <input value={gen.tema} onChange={e => setGen({ ...gen, tema: e.target.value })} placeholder="es. ansia prima dei prelievi in pediatria" /></label>
            <label>Istruzioni (facoltative) <textarea rows={2} value={gen.istruzioni} onChange={e => setGen({ ...gen, istruzioni: e.target.value })} placeholder="es. racconta la consegna di ieri al Meyer, tono pratico" /></label>
            <div className="row tight" style={{ marginTop: 8 }}>
              <button className="btn orange" disabled={busy} onClick={genera}>{busy ? 'Scrivo… (10-30 s)' : '✨ Genera bozza'}</button>
              {err && <span className="errtxt small">{err}</span>}
            </div>
          </>
        ) : <p className="small errtxt">Puoi generare bozze solo per il tuo profilo.</p>}
      </div>

      {bozze.map(p => <Bozza key={p.id} post={p} chi={chi} puo={puo} apri={apri} />)}
      {!bozze.length && <p className="muted">Nessuna bozza AI per {nome}.</p>}
    </div>
  );
}

function Bozza({ post, chi, puo, apri }) {
  const [gancio, setGancio] = useState(0);
  const [slot, setSlot] = useState('');
  const [msg, setMsg] = useState(null);
  const testo = conGancio(post, gancio);
  const prof = (P()?.profili() || []).find(x => x.id === chi);
  const liberi = (prof?.posts || []).filter(x => P()?.stato(chi, 'pubblicato', x.id) !== '1' && P()?.stato(chi, 'archiviato-subito', x.id) !== '1' && localStorage.getItem('scartato-globale-' + x.id) !== '1');

  async function copia() {
    try { await navigator.clipboard.writeText(testo); setMsg('Testo copiato ✓'); } catch { setMsg('Copia non riuscita'); }
  }
  function metti() {
    if (!slot) return;
    const s = liberi.find(x => x.id === slot);
    if (!confirm(`Sostituire il testo del post ${slot} («${(s?.titolo || '').slice(0, 60)}») con questa bozza? Il testo originale si recupera con «Ripristina».`)) return;
    P().mettiInSlot(chi, slot, testo);
  }

  return (
    <div className="card">
      <div className="row tight" style={{ justifyContent: 'space-between' }}>
        <b>{primaRiga(testo).slice(0, 110)}</b>
        <span className="small muted">{fmtData(post.created_at)}{post.generazione?.esplorazione ? ' · esplorazione' : ''}</span>
      </div>
      {(post.ganci_opzioni || []).length > 1 && (
        <div className="row tight" style={{ margin: '6px 0' }}>
          <span className="small muted">Apertura:</span>
          {post.ganci_opzioni.map((g, i) => <button key={i} className={'btn xs ' + (i === gancio ? '' : 'ghost')} onClick={() => setGancio(i)}>{g.formula}</button>)}
        </div>
      )}
      <pre className="lemo-testo">{testo}</pre>
      {post.note && <p className="small errtxt">{post.note}</p>}
      {post.fonti && <p className="small muted">Fonti: {String(post.fonti).slice(0, 400)}</p>}
      <div className="row tight" style={{ marginTop: 8 }}>
        <button className="btn ghost sm" onClick={copia}>Copia testo</button>
        {puo && liberi.length > 0 && <>
          <select value={slot} onChange={e => setSlot(e.target.value)}>
            <option value="">Metti nello slot del calendario…</option>
            {liberi.map(x => <option key={x.id} value={x.id}>Post {x.id} · {x.when || x.data} · {(x.titolo || '').slice(0, 50)}</option>)}
          </select>
          <button className="btn sm" disabled={!slot} onClick={metti}>Metti nello slot</button>
        </>}
        <button className="btn ghost sm" onClick={() => apri(post.id)}>Apri con grafica</button>
        {msg && <span className="small">{msg}</span>}
      </div>
    </div>
  );
}
