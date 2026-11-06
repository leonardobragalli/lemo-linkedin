// Scheda «Bozze AI» dentro il Pannello: genera una bozza (Gemini + dati + Lemons Insights)
// e la mette in uno slot del calendario del Pannello, oppure la apre nell'editor completo.
import { useEffect, useMemo, useState } from 'react';
import { supabase, supabaseUrl } from '../supabase.js';
import { normalizzaTestoPuro, primaRiga, fmtData, corpoDopoApertura } from '../lib/util.js';

const P = () => window.__lemoPannello;

function conGancio(post, i) {
  const g = (post.ganci_opzioni || [])[i];
  if (!g?.uni) return post.testo || '';
  const righe = normalizzaTestoPuro(post.testo || '').split('\n');
  return g.uni.replace(/\n+$/, '') + '\n' + corpoDopoApertura(righe).join('\n');
}

export default function BozzeAI({ members, posts, me, apri, applica, rimuovi }) {
  const [chi, setChi] = useState(() => P()?.profiloAttivo() || me.id);
  const [gen, setGen] = useState({ tema: '', istruzioni: '', lingua: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [facts, setFacts] = useState({});
  useEffect(() => { supabase.from('facts').select('chiave,etichetta,valore').then(({ data }) => setFacts(Object.fromEntries((data || []).map(f => [f.chiave, f])))); }, []);

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

  async function genera(rifai) {
    const linguaDef = members.find(m => m.id === chi)?.lingua || 'it';
    const lingua = gen.lingua || linguaDef;
    const corpo = rifai || { member_id: chi, tema: gen.tema, istruzioni: gen.istruzioni, lingua: lingua === 'entrambe' ? linguaDef : lingua };
    setBusy(true); setErr(null);
    const { data: s } = await supabase.auth.getSession();
    const r = await fetch(`${supabaseUrl}/functions/v1/genera-bozza`, {
      method: 'POST', headers: { Authorization: 'Bearer ' + s.session.access_token, 'Content-Type': 'application/json' },
      body: JSON.stringify(corpo),
    });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) { setErr(j.error || `Errore ${r.status}`); return; }
    applica('posts', j.post);
    if (j.eliminato) rimuovi('posts', j.eliminato);
    if (!rifai && lingua === 'entrambe') await traduci(j.post, linguaDef === 'en' ? 'it' : 'en');
    if (!rifai) setGen({ tema: '', istruzioni: '', lingua: gen.lingua });
  }

  async function traduci(post, verso) {
    setBusy(true); setErr(null);
    const { data: s } = await supabase.auth.getSession();
    const r = await fetch(`${supabaseUrl}/functions/v1/genera-bozza`, {
      method: 'POST', headers: { Authorization: 'Bearer ' + s.session.access_token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ azione: 'traduci', post_id: post.id, lingua: verso }),
    });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) { setErr(j.error || `Errore ${r.status}`); return; }
    applica('posts', j.post);
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
        <p className="small muted">Gemini scrive partendo dalla scheda dell'autore (ruolo, lingua, temi, voce), dagli studi di Lemons Insights e PubMed e dai numeri aziendali confermati o provvisori.
          Controlla da solo lunghezza, prima riga, frasi già usate dal team e claim vietati; ogni numero senza fonte o provvisorio viene segnato <b>DA VERIFICARE</b>. Poi la metti in uno slot del calendario e la rifinisci lì.</p>
        {puo ? (
          <>
            <label>Tema (facoltativo) <input value={gen.tema} onChange={e => setGen({ ...gen, tema: e.target.value })} placeholder="es. ansia prima dei prelievi in pediatria" /></label>
            <label>Istruzioni (facoltative) <textarea rows={2} value={gen.istruzioni} onChange={e => setGen({ ...gen, istruzioni: e.target.value })} placeholder="es. racconta la consegna di ieri al Meyer, tono pratico" /></label>
            <div className="row tight" style={{ marginTop: 8 }}>
              <label className="small">Lingua <select value={gen.lingua || (members.find(m => m.id === chi)?.lingua || 'it')} onChange={e => setGen({ ...gen, lingua: e.target.value })}>
                <option value="it">Italiano</option><option value="en">English</option><option value="entrambe">Entrambe (IT + EN)</option>
              </select></label>
              <button className="btn orange" disabled={busy} onClick={() => genera()}>{busy ? 'Scrivo… (10-40 s)' : '✨ Genera bozza'}</button>
              {err && <span className="errtxt small">{err}</span>}
            </div>
          </>
        ) : <p className="small errtxt">Puoi generare bozze solo per il tuo profilo.</p>}
      </div>

      {bozze.map(p => <Bozza key={p.id} post={p} chi={chi} puo={puo} apri={apri} facts={facts} rigenera={() => genera({ member_id: p.member_id, tema: p.generazione?.tema_richiesto ?? p.tema ?? '', istruzioni: p.generazione?.istruzioni || '', lingua: p.generazione?.lingua, sostituisci: p.id })} traduci={traduci} busy={busy} applica={applica} rimuovi={rimuovi} />)}
      {!bozze.length && <p className="muted">Nessuna bozza AI per {nome}.</p>}
    </div>
  );
}

function Bozza({ post, chi, puo, apri, facts, rigenera, traduci, busy, applica, rimuovi }) {
  const lingua = post.generazione?.lingua || 'it';
  const [gancio, setGancio] = useState(0);
  const [slot, setSlot] = useState('');
  const [msg, setMsg] = useState(null);
  const testo = conGancio(post, gancio);
  const prof = (P()?.profili() || []).find(x => x.id === chi);
  const liberi = (prof?.posts || []).filter(x => P()?.stato(chi, 'pubblicato', x.id) !== '1' && P()?.stato(chi, 'archiviato-subito', x.id) !== '1' && localStorage.getItem('scartato-globale-' + x.id) !== '1');

  const precedenti = post.generazione?.precedenti || [];
  async function elimina() {
    if (!confirm('Eliminare questa bozza? Non si può recuperare.')) return;
    const { error } = await supabase.from('posts').delete().eq('id', post.id);
    if (error) setMsg(error.message); else rimuovi('posts', post.id);
  }
  async function rigeneraTesto() {
    if (!confirm('Riscrivere questa bozza sullo stesso tema? La versione attuale resta recuperabile con «Versione precedente».')) return;
    rigenera();
  }
  // scambia la versione attuale con l'ultima precedente (premendo di nuovo si torna indietro)
  async function versionePrecedente() {
    const p = precedenti[precedenti.length - 1]; if (!p) return;
    const { precedenti: _x, ...genAtt } = post.generazione || {};
    const attuale = { testo: post.testo, testo_generato: post.testo_generato, ganci_opzioni: post.ganci_opzioni, commento: post.commento, note: post.note, fonti: post.fonti, vis: post.vis, tema: post.tema, titolo: post.titolo, hook_formula: post.hook_formula, formato: post.formato, generazione: genAtt };
    const { generazione: genP, ...campi } = p;
    const { data, error } = await supabase.from('posts').update({ ...campi, testo_originale: p.testo_generato || p.testo, generazione: { ...genP, precedenti: [...precedenti.slice(0, -1), attuale] } }).eq('id', post.id).select().single();
    if (error) setMsg(error.message); else applica('posts', data);
  }

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
        <span className="small muted"><span className="badge">{lingua.toUpperCase()}</span> {fmtData(post.created_at)}{post.generazione?.esplorazione ? ' · esplorazione' : ''}</span>
      </div>
      {(post.ganci_opzioni || []).length > 1 && (
        <div className="row tight" style={{ margin: '6px 0' }}>
          <span className="small muted">Apertura:</span>
          {post.ganci_opzioni.map((g, i) => <button key={i} className={'btn xs ' + (i === gancio ? '' : 'ghost')} onClick={() => setGancio(i)}>{g.formula}</button>)}
        </div>
      )}
      <pre className="lemo-testo">{testo}</pre>
      {post.note && <p className="small errtxt">{post.note}</p>}
      {(() => {
        const cambiati = Object.entries(post.generazione?.numeri_valori || {}).filter(([k, v]) => facts[k] && facts[k].valore !== v);
        return cambiati.length > 0 && (
          <p className="small errtxt">⚠ Numero cambiato: {cambiati.map(([k, v]) => `${facts[k].etichetta} era «${v}», ora «${facts[k].valore}»`).join('; ')}
            {puo && <> · <button className="btn xs" disabled={busy} onClick={rigenera}>Rigenera</button></>}</p>
        );
      })()}
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
        {puo && <button className="btn ghost sm" disabled={busy} onClick={rigeneraTesto}>{busy ? '…' : '🔄 Rigenera testo'}</button>}
        {puo && precedenti.length > 0 && <button className="btn ghost sm" onClick={versionePrecedente} title="Scambia con la versione precedente">↩ Versione precedente ({precedenti.length})</button>}
        {puo && <button className="btn ghost sm danger" onClick={elimina}>🗑 Elimina</button>}
        {puo && <button className="btn ghost sm" disabled={busy} onClick={() => traduci(post, lingua === 'en' ? 'it' : 'en')}>{lingua === 'en' ? 'Crea versione in italiano' : 'Crea versione in inglese'}</button>}
        {msg && <span className="small">{msg}</span>}
      </div>
    </div>
  );
}
