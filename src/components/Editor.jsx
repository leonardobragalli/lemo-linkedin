import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../supabase.js';
import { avatar, STATI, fmtData, partiRoma, romaToIso, formattaPerLinkedIn, normalizzaTestoPuro, toBold, fromBold, isBold, estraiUrn, dataDaUrn, scaricaUrl, corpoDopoApertura } from '../lib/util.js';
import { immaginiPost } from '../lib/grafica.js';
import Grafiche from './Grafiche.jsx';
import { interazioni } from '../lib/insights.js';

const LIMITE = 3000;

export default function Editor({ post, members, posts, metrics, me, chiudi, applica, rimuovi }) {
  const member = members.find(m => m.id === post.member_id);
  const puoModificare = post.member_id === me.id || me.is_admin;
  const r0 = partiRoma(post.scheduled_at);
  const [f, setF] = useState(() => ({
    testo: post.testo || '', titolo: post.titolo || '', tema: post.tema || '', fonti: post.fonti || '', commento: post.commento || '',
    formato: post.formato || 'immagini', is_riserva: !!post.is_riserva, note: post.note || '', usa_come_esempio: post.usa_come_esempio !== false,
    data: r0?.ymd || '', ora: r0 ? `${r0.hh}:${r0.mm}` : '',
  }));
  const [dirty, setDirty] = useState(false);
  const [msg, setMsg] = useState(null);
  const [imgs, setImgs] = useState(null);
  const [scelte, setScelte] = useState(null);   // immagini dello stile scelto (bozze AI con grafica nuova)
  const nuovaGrafica = !!post.vis?.grafica;
  const [conflitto, setConflitto] = useState(false);
  const [guida, setGuida] = useState(false);
  const baseUpdated = useRef(post.updated_at);
  const taRef = useRef(null);

  function caricaRemota() {
    baseUpdated.current = post.updated_at;
    const r = partiRoma(post.scheduled_at);
    setF(x => ({ ...x, testo: post.testo || '', titolo: post.titolo || '', tema: post.tema || '', fonti: post.fonti || '', commento: post.commento || '', formato: post.formato, is_riserva: post.is_riserva, note: post.note || '', data: r?.ymd || '', ora: r ? `${r.hh}:${r.mm}` : '' }));
    setDirty(false); setConflitto(false);
  }
  // Qualcun altro ha salvato mentre stavo modificando?
  useEffect(() => {
    if (post.updated_at !== baseUpdated.current) {
      if (dirty) setConflitto(true);
      else caricaRemota();
    }
  }, [post.updated_at]); // eslint-disable-line

  const idxSlot = useMemo(() => posts.filter(p => p.member_id === post.member_id && p.origine === 'piano').sort((a, b) => (a.slot < b.slot ? -1 : 1)).findIndex(p => p.id === post.id), [posts, post]);
  useEffect(() => {
    let alive = true;
    setImgs(null);
    immaginiPost(member, { ...post, formato: f.formato, titolo: f.titolo, tema: f.tema, fonti: f.fonti }, Math.max(0, idxSlot))
      .then(x => { if (alive) setImgs(x); })
      .catch(() => { if (alive) setImgs([]); });
    return () => { alive = false; };
  }, [post.id, post.updated_at, f.formato]); // eslint-disable-line

  const set = (k, v) => { setF(x => ({ ...x, [k]: v })); setDirty(true); };
  const testoLi = formattaPerLinkedIn(f.testo);
  const prima = fromBold(normalizzaTestoPuro(f.testo).split('\n')[0] || '');
  const myMetrics = metrics.filter(m => m.post_id === post.id).sort((a, b) => (a.captured_at < b.captured_at ? 1 : -1));

  async function salva(extra = {}) {
    const patch = {
      testo: f.testo, titolo: f.titolo, tema: f.tema, fonti: f.fonti, commento: f.commento,
      formato: f.formato, is_riserva: f.is_riserva, note: f.note, usa_come_esempio: f.usa_come_esempio,
      scheduled_at: f.data ? romaToIso(f.data, f.ora || '09:00') : null,
      ...extra,
    };
    const { data, error } = await supabase.from('posts').update(patch).eq('id', post.id).select().single();
    if (error) { setMsg({ err: error.message }); return false; }
    baseUpdated.current = data.updated_at;
    applica('posts', data); setDirty(false); setConflitto(false);
    setMsg({ ok: 'Salvato ✓ — tutto il team lo vede già' });
    return true;
  }

  function grassetto() {
    const ta = taRef.current; if (!ta) return;
    const { selectionStart: a, selectionEnd: b } = ta;
    if (a === b) return;
    const sel = f.testo.slice(a, b);
    const nuovo = isBold(sel) ? fromBold(sel) : toBold(fromBold(sel));
    set('testo', f.testo.slice(0, a) + nuovo + f.testo.slice(b));
    setTimeout(() => { ta.focus(); ta.setSelectionRange(a, a + nuovo.length); }, 0);
  }
  function cambiaGancio(i) {
    const g = (post.ganci_opzioni || [])[i]; if (!g?.uni) return;
    const righe = normalizzaTestoPuro(f.testo).split('\n');
    set('testo', g.uni.replace(/\n+$/, '') + '\n' + corpoDopoApertura(righe).join('\n'));
  }

  async function pubblicaAssistito() {
    if (dirty && !(await salva())) return;
    const w = window.open('about:blank', '_blank');
    try { await navigator.clipboard.writeText(testoLi); } catch { /* fallback sotto */ }
    let i = 0;
    for (const im of ((nuovaGrafica ? scelte : imgs) || []).filter(x => nuovaGrafica ? (x.pdf || !(scelte || []).some(y => y.pdf)) : (!x.pdf || f.formato === 'carosello'))) { i++; scaricaUrl(im.url, `${String(i).padStart(2, '0')}_${im.nome}`); await new Promise(r => setTimeout(r, 300)); }
    setGuida(true);
    if (w) w.location.href = 'https://www.linkedin.com/feed/?shareActive=true'; else window.open('https://www.linkedin.com/feed/?shareActive=true', '_blank');
    setMsg({ ok: 'Testo copiato e immagini scaricate (01_, 02_…). Su LinkedIn: incolla, aggiungi le immagini, Pubblica o Pianifica.' });
  }

  const [url, setUrl] = useState(post.linkedin_url || '');
  async function segnaPubblicato() {
    const urn = estraiUrn(url);
    if (!urn) { setMsg({ err: 'Incolla il link del post (es. https://www.linkedin.com/feed/update/urn:li:activity:…)' }); return; }
    await salva({ stato: 'pubblicato', linkedin_url: url.trim(), linkedin_urn: urn, published_at: dataDaUrn(urn) || new Date().toISOString() });
  }

  async function elimina() {
    if (!confirm('Eliminare definitivamente questo post?')) return;
    const { error } = await supabase.from('posts').delete().eq('id', post.id);
    if (error) { setMsg({ err: error.message }); return; }
    rimuovi('posts', post.id); chiudi();
  }

  return (
    <div className="overlay" onMouseDown={e => { if (e.target === e.currentTarget && (!dirty || confirm('Chiudere senza salvare?'))) chiudi(); }}>
      <div className="drawer">
        <div className="dr-head">
          <img className="av" src={avatar(post.member_id)} alt="" />
          <div>
            <b>{member?.nome}</b> <span className="muted">{post.slot ? `· slot #${post.slot}` : post.origine === 'storico' ? '· post precedente al piano' : '· post nuovo'}</span>
            <div className="small muted">Ultima modifica {fmtData(post.updated_at)} {post.updated_by ? `da ${members.find(m => m.id === post.updated_by)?.nome_breve || post.updated_by}` : ''}</div>
          </div>
          <span className="badge" style={{ color: STATI[post.stato].color, background: STATI[post.stato].bg }}>{STATI[post.stato].label}</span>
          <div className="sp" />
          {dirty && <span className="badge warn">Modifiche non salvate</span>}
          <button className="btn ghost sm" onClick={() => (!dirty || confirm('Chiudere senza salvare?')) && chiudi()}>✕</button>
        </div>
        {conflitto && (
          <div className="banner">Qualcuno ha appena salvato questo post. <button className="btn sm" onClick={caricaRemota}>Carica la sua versione</button> <button className="btn ghost sm" onClick={() => salva()}>Sovrascrivi con la mia</button></div>
        )}
        {msg && <div className={msg.err ? 'banner err' : 'banner ok'} onClick={() => setMsg(null)}>{msg.err || msg.ok}</div>}

        <div className="dr-body">
          <div className="col-l">
            <div className="row">
              <label>Data <input type="date" value={f.data} disabled={!puoModificare} onChange={e => set('data', e.target.value)} /></label>
              <label>Ora <input type="time" value={f.ora} disabled={!puoModificare} onChange={e => set('ora', e.target.value)} /></label>
              <label>Formato <select value={f.formato} disabled={!puoModificare} onChange={e => set('formato', e.target.value)}>
                <option value="immagini">Immagini</option><option value="carosello">Carosello PDF</option><option value="testo">Solo testo</option><option value="link">Link</option><option value="altro">Altro</option>
              </select></label>
              <label className="chk"><input type="checkbox" checked={f.is_riserva} disabled={!puoModificare} onChange={e => set('is_riserva', e.target.checked)} /> Riserva</label>
              <label className="chk" title="Se tolto, l'AI non userà questo post come esempio (utile per post personali o fuori tema)"><input type="checkbox" checked={f.usa_come_esempio} disabled={!puoModificare} onChange={e => set('usa_come_esempio', e.target.checked)} /> Esempio per l'AI</label>
            </div>
            <label>Titolo interno <input value={f.titolo} disabled={!puoModificare} onChange={e => set('titolo', e.target.value)} /></label>
            <div className="row tight">
              <b>Testo</b>
              <span className={'small ' + (testoLi.length > LIMITE ? 'errtxt' : 'muted')}>{testoLi.length}/{LIMITE}</span>
              <span className={'small ' + ([...prima].length > 140 ? 'errtxt' : 'muted')} title="Su telefono LinkedIn taglia dopo ~140 caratteri con «…altro»">prima riga {[...prima].length} car.</span>
              <div className="sp" />
              {puoModificare && <button className="btn ghost sm" onClick={grassetto} title="Seleziona del testo e premi">𝗕 grassetto</button>}
              {puoModificare && (post.ganci_opzioni || []).length > 0 && (
                <select defaultValue="" onChange={e => { cambiaGancio(+e.target.value); e.target.value = ''; }}>
                  <option value="" disabled>Cambia apertura…</option>
                  {post.ganci_opzioni.map((g, i) => <option key={i} value={i}>{g.formula}</option>)}
                </select>
              )}
              {puoModificare && post.testo_originale && f.testo !== post.testo_originale && <button className="btn ghost sm" onClick={() => confirm('Tornare al testo originale del kit?') && set('testo', post.testo_originale)}>Ripristina originale</button>}
            </div>
            <textarea ref={taRef} value={f.testo} disabled={!puoModificare} onChange={e => set('testo', e.target.value)} rows={18} />
            <label>Fonti <textarea rows={2} value={f.fonti} disabled={!puoModificare} onChange={e => set('fonti', e.target.value)} /></label>
            <label>Primo commento / note per l'autore <textarea rows={3} value={f.commento} disabled={!puoModificare} onChange={e => set('commento', e.target.value)} /></label>
            <label>Note interne <textarea rows={2} value={f.note} disabled={!puoModificare} onChange={e => set('note', e.target.value)} placeholder="es. DA CHIEDERE: dato 45 secondi da verificare" /></label>
          </div>

          <div className="col-r">
            <div className="preview">
              <div className="pv-head"><img className="av" src={avatar(post.member_id)} alt="" /><div><b>{member?.nome}</b><div className="small muted">{(member?.headline_it || '').slice(0, 80)}…</div></div></div>
              <div className="pv-text">{testoLi}</div>
            </div>
            {guida && (
              <div className="card info small">
                <b>Su LinkedIn (scheda appena aperta):</b>
                <ol style={{ margin: '6px 0 0', paddingLeft: 18 }}>
                  <li>Clicca nel riquadro del post e incolla (Ctrl+V / ⌘V).</li>
                  <li>Icona immagine → seleziona dai Download i file <b>01_</b>, <b>02_</b>… nell'ordine.</li>
                  <li>«Pubblica», oppure l'orologio accanto per <b>pianificare</b> all'orario del calendario ({f.data ? `${f.data} ${f.ora}` : 'da decidere'}).</li>
                </ol>
                <div className="muted" style={{ marginTop: 6 }}>Con lo script collegato il post viene riconosciuto e segnato come pubblicato da solo; altrimenti incolla il link qui sotto.</div>
              </div>
            )}
            {post.generazione && <Generazione g={post.generazione} />}
            {nuovaGrafica ? <Grafiche post={post} vecchie={imgs} onScelta={setScelte} /> : <div className="imgs">
              {imgs === null && <div className="muted small">Genero le immagini…</div>}
              {imgs && imgs.length === 0 && <div className="muted small">Nessuna immagine per questo formato.</div>}
              {imgs && imgs.map(im => (
                <div key={im.nome} className="img">
                  {im.pdf ? <div className="pdf">PDF carosello</div> : <img src={im.url} alt={im.nome} loading="lazy" />}
                  <button className="btn ghost xs" onClick={() => scaricaUrl(im.url, im.nome)}>↓ {im.nome}</button>
                </div>
              ))}
            </div>}
            {member.id !== 'matteo' && post.origine === 'piano' && <p className="small muted">⚠ Le tavole dei colleghi contengono numeri fissi per slot (dal kit): verificali prima di pubblicare.</p>}
          </div>
        </div>

        <div className="dr-foot">
          {puoModificare && <>
            <button className="btn" disabled={!dirty} onClick={() => salva()}>Salva</button>
            {post.stato === 'da_rivedere' && <button className="btn blue" onClick={() => salva({ stato: 'approvato' })}>Approva</button>}
            {post.stato !== 'pubblicato' && <button className="btn orange" onClick={pubblicaAssistito}>Copia testo + scarica immagini + apri LinkedIn</button>}
            {post.stato !== 'scartato' && post.stato !== 'pubblicato' && <button className="btn ghost" onClick={() => salva({ stato: 'scartato' })}>Scarta</button>}
            {post.stato === 'scartato' && <button className="btn ghost" onClick={() => salva({ stato: 'da_rivedere' })}>Ripristina</button>}
            {post.origine === 'nuovo' && <button className="btn ghost danger" onClick={elimina}>Elimina</button>}
          </>}
          {!puoModificare && <span className="muted small">Sola lettura: è un post di {member?.nome_breve}.</span>}
        </div>

        {puoModificare && (
          <div className="dr-pub">
            <b>{post.stato === 'pubblicato' ? 'Link del post' : 'Pubblicato? Incolla il link del post'}</b>
            <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://www.linkedin.com/feed/update/urn:li:activity:…" />
            <button className="btn sm" onClick={segnaPubblicato}>{post.stato === 'pubblicato' ? 'Aggiorna link' : 'Segna come pubblicato'}</button>
            {post.linkedin_url && <a href={post.linkedin_url} target="_blank" rel="noreferrer" className="small">Apri su LinkedIn ↗</a>}
          </div>
        )}

        {post.stato === 'pubblicato' && <Metriche post={post} lista={myMetrics} puo={puoModificare} me={me} applica={applica} rimuovi={rimuovi} />}
      </div>
    </div>
  );
}

const CAMPI = [
  ['impressions', 'Impressioni'], ['members_reached', 'Persone raggiunte'], ['reactions', 'Reazioni'],
  ['comments', 'Commenti'], ['reposts', 'Diffusioni'], ['saves', 'Salvataggi'], ['clicks', 'Clic'], ['followers_gained', 'Nuovi follower'],
];

function Metriche({ post, lista, puo, me, applica, rimuovi }) {
  const vuoto = Object.fromEntries(CAMPI.map(([k]) => [k, '']));
  const [v, setV] = useState(vuoto);
  const [err, setErr] = useState(null);
  const ore = post.published_at ? Math.round((Date.now() - new Date(post.published_at)) / 36e5) : null;

  async function aggiungi(e) {
    e.preventDefault();
    const row = { post_id: post.id, fonte: 'manuale', entered_by: me.id };
    let alcuni = false;
    for (const [k] of CAMPI) if (v[k] !== '') { row[k] = parseInt(v[k], 10); alcuni = true; }
    if (!alcuni) { setErr('Inserisci almeno un numero'); return; }
    const { data, error } = await supabase.from('post_metrics').insert(row).select().single();
    if (error) { setErr(error.message); return; }
    applica('post_metrics', data); setV(vuoto); setErr(null);
  }
  async function togli(id) {
    if (!confirm('Eliminare questa rilevazione?')) return;
    const { error } = await supabase.from('post_metrics').delete().eq('id', id);
    if (!error) rimuovi('post_metrics', id);
  }

  return (
    <div className="dr-metrics">
      <h3>Dati del post {ore != null && <span className="muted small">· pubblicato da {ore < 48 ? `${ore} ore` : `${Math.round(ore / 24)} giorni`}</span>}</h3>
      <p className="small muted">Arrivano da soli dallo script «Collega LinkedIn» (al massimo ogni 12 ore, quando l'autore apre LinkedIn).</p>
      {lista.length > 0 && (
        <table className="tbl">
          <thead><tr><th>Rilevato</th>{CAMPI.map(([, l]) => <th key={l}>{l}</th>)}<th>Interaz.</th><th>Fonte</th><th /></tr></thead>
          <tbody>{lista.map(m => (
            <tr key={m.id}><td>{fmtData(m.captured_at)}</td>{CAMPI.map(([k]) => <td key={k}>{m[k] ?? '—'}</td>)}<td><b>{interazioni(m)}</b></td><td className="small muted">{m.fonte}</td>
              <td>{puo && <button className="btn ghost xs" onClick={() => togli(m.id)}>✕</button>}</td></tr>
          ))}</tbody>
        </table>
      )}
      {puo && (
        <details style={{ marginTop: 10 }}><summary className="small muted">Inserimento manuale (solo se lo script non è collegato)</summary>
        <form className="mform" onSubmit={aggiungi}>
          {CAMPI.map(([k, l]) => <label key={k}>{l}<input type="number" min="0" value={v[k]} onChange={e => setV({ ...v, [k]: e.target.value })} /></label>)}
          <button className="btn sm">+ Registra dati di oggi</button>
          {err && <span className="errtxt small">{err}</span>}
        </form></details>
      )}
    </div>
  );
}

function Generazione({ g }) {
  const dubbi = (g.claim || []).filter(c => c.stato !== 'fonte citata');
  return (
    <div className="card small" style={{ margin: 0 }}>
      <b>✨ Bozza AI</b> <span className="muted">· {g.modello} · playbook team v{g.playbook?.team ?? '—'} / autore v{g.playbook?.autore ?? '—'}</span>
      {g.esplorazione && <div className="badge ghost" style={{ marginLeft: 0, marginTop: 6, display: 'inline-block' }}>Esplorazione: prova un'apertura «{g.apertura_provata}» per raccogliere dati</div>}
      {(g.numeri_da_verificare?.length > 0 || dubbi.length > 0) && (
        <div className="errtxt" style={{ marginTop: 6 }}>
          <b>DA VERIFICARE prima di pubblicare:</b>
          <ul style={{ margin: '4px 0', paddingLeft: 18 }}>
            {(g.numeri_da_verificare || []).map(n => <li key={n}>numero «{n}» non trovato nelle fonti</li>)}
            {dubbi.map((c, i) => <li key={i}>{c.frase}</li>)}
          </ul>
        </div>
      )}
      {g.fonti_usate?.length > 0 && (
        <details style={{ marginTop: 6 }}><summary>Fonti consultate ({g.fonti_usate.length})</summary>
          <ul style={{ margin: '4px 0', paddingLeft: 18 }}>{g.fonti_usate.map(f => <li key={f.id}>{f.url ? <a href={f.url} target="_blank" rel="noreferrer">{f.titolo}</a> : f.titolo}</li>)}</ul>
        </details>
      )}
    </div>
  );
}
