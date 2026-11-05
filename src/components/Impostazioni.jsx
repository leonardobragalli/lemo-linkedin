import { useEffect, useState } from 'react';
import { supabase, supabaseUrl } from '../supabase.js';
import { fmtData, avatar } from '../lib/util.js';

// Pagina admin: inviti, profili, numeri aziendali, fonti Notion, chiave Notion, aggiornamento conoscenza.
async function chiamaFunzione(nome, body) {
  const { data: s } = await supabase.auth.getSession();
  const r = await fetch(`${supabaseUrl}/functions/v1/${nome}`, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + s.session.access_token, 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {}),
  });
  let d = {}; try { d = await r.json(); } catch { /* vuoto */ }
  if (!r.ok || d.error) throw new Error(d.error || `Errore ${r.status}`);
  return d;
}

export default function Impostazioni({ members, me, applica, rimuovi }) {
  if (!me.is_admin) return <section><div className="card">Questa pagina è riservata agli admin.</div></section>;
  return (
    <section>
      <div className="toolbar"><h2>Impostazioni</h2><span className="muted small">Tutto quello che modifichi qui vale subito per tutto il team.</span></div>
      <Inviti members={members} me={me} applica={applica} rimuovi={rimuovi} />
      <Numeri me={me} />
      <Fonti />
    </section>
  );
}

// ───────────────────────── Team e inviti ─────────────────────────
function Inviti({ members, me, applica, rimuovi }) {
  const [accessi, setAccessi] = useState({});
  const [nuovo, setNuovo] = useState(null);
  const carica = () => supabase.rpc('stato_accessi').then(({ data }) => setAccessi(Object.fromEntries((data || []).map(a => [a.member_id, a]))));
  useEffect(() => { carica(); }, []);

  async function crea(e) {
    e.preventDefault();
    const id = nuovo.nome_breve.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    if (!id) return;
    if (members.some(m => m.id === id)) { alert('Esiste già un profilo con questo nome breve'); return; }
    const { data, error } = await supabase.from('team_members').insert({
      id, nome: nuovo.nome.trim(), nome_breve: nuovo.nome_breve.trim(), ruolo: nuovo.ruolo.trim() || null,
      colore: nuovo.colore, ordine: Math.max(0, ...members.map(m => m.ordine || 0)) + 1, is_admin: false,
    }).select().single();
    if (error) { alert(error.message); return; }
    applica('team_members', data); setNuovo(null);
  }

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <h3>Team e inviti</h3>
      <p className="small muted">Scrivi l'email aziendale e premi <b>Invita</b>: il collega riceve una mail con il link per entrare. Puoi rimandarla quando vuoi.</p>
      <table className="tbl inviti"><tbody>
        {members.map(m => <RigaMembro key={m.id} m={m} me={me} acc={accessi[m.id]} applica={applica} rimuovi={rimuovi} ricarica={carica} />)}
      </tbody></table>
      {nuovo ? (
        <form className="row tight" onSubmit={crea} style={{ marginTop: 10 }}>
          <input required placeholder="Nome completo (es. Dott. Mario Rossi)" value={nuovo.nome} onChange={e => setNuovo({ ...nuovo, nome: e.target.value })} />
          <input required placeholder="Nome breve (es. Mario)" value={nuovo.nome_breve} onChange={e => setNuovo({ ...nuovo, nome_breve: e.target.value })} />
          <input placeholder="Ruolo" value={nuovo.ruolo} onChange={e => setNuovo({ ...nuovo, ruolo: e.target.value })} />
          <input type="color" value={nuovo.colore} onChange={e => setNuovo({ ...nuovo, colore: e.target.value })} />
          <button className="btn sm">Crea profilo</button>
          <button type="button" className="btn ghost sm" onClick={() => setNuovo(null)}>Annulla</button>
        </form>
      ) : <button className="btn ghost sm" style={{ marginTop: 10 }} onClick={() => setNuovo({ nome: '', nome_breve: '', ruolo: '', colore: '#0EA5E9' })}>+ Aggiungi persona</button>}
    </div>
  );
}

function RigaMembro({ m, me, acc, applica, rimuovi, ricarica }) {
  const [email, setEmail] = useState(m.email || '');
  const [nome, setNome] = useState(m.nome || '');
  const [breve, setBreve] = useState(m.nome_breve || '');
  const [ruolo, setRuolo] = useState(m.ruolo || '');
  const [stato, setStato] = useState(null);
  const [modifica, setModifica] = useState(false);
  useEffect(() => { setEmail(m.email || ''); setNome(m.nome || ''); setBreve(m.nome_breve || ''); setRuolo(m.ruolo || ''); }, [m.email, m.nome, m.nome_breve, m.ruolo]);

  async function invita() {
    setStato({ t: 'Invio…' });
    try {
      const d = await chiamaFunzione('invita', { member_id: m.id, email });
      setStato({ ok: true, t: d.tipo === 'invito' ? 'Invito inviato ✓' : 'Link d\'accesso inviato ✓' });
      ricarica();
    } catch (e) { setStato({ t: e.message }); }
  }
  async function salvaProfilo() {
    const { data, error } = await supabase.from('team_members').update({ nome: nome.trim(), nome_breve: breve.trim(), ruolo: ruolo.trim() || null }).eq('id', m.id).select().single();
    if (error) { setStato({ t: error.message }); return; }
    applica('team_members', data); setModifica(false); setStato({ ok: true, t: 'Salvato ✓' });
  }
  async function toggleAdmin() {
    const { data, error } = await supabase.from('team_members').update({ is_admin: !m.is_admin }).eq('id', m.id).select().single();
    if (error) { setStato({ t: error.message }); return; }
    applica('team_members', data);
  }
  async function elimina() {
    if (!confirm(`Eliminare il profilo di ${m.nome}? Si cancellano anche i suoi post e i suoi dati. Non si può annullare.`)) return;
    const { error } = await supabase.from('team_members').delete().eq('id', m.id);
    if (error) { setStato({ t: error.message }); return; }
    rimuovi('team_members', m.id);
  }

  const entrato = acc?.ultimo_accesso;
  const etichetta = entrato ? `Entrato · ${fmtData(entrato)}` : m.invitato_il ? `Invitato · ${fmtData(m.invitato_il)}` : m.email ? 'Non ancora invitato' : 'Manca l\'email';
  const emailValida = /^[^@\s]+@lemonsintheroom\.com$/i.test(email.trim());

  return (
    <tr>
      <td style={{ width: 44 }}><img className="av" src={avatar(m.id)} alt="" style={{ borderColor: m.colore }} /></td>
      <td>
        {modifica ? (
          <div className="col" style={{ gap: 4 }}>
            <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome completo" />
            <input value={breve} onChange={e => setBreve(e.target.value)} placeholder="Nome breve" />
            <input value={ruolo} onChange={e => setRuolo(e.target.value)} placeholder="Ruolo" />
            <div className="row tight"><button className="btn sm" onClick={salvaProfilo}>Salva</button><button className="btn ghost sm" onClick={() => setModifica(false)}>Annulla</button></div>
          </div>
        ) : (
          <><b>{m.nome}</b> {m.is_admin && <span className="badge ghost">admin</span>}<div className="small muted">{m.ruolo || '—'}</div>
            <button className="btn ghost xs" onClick={() => setModifica(true)}>Modifica nome e ruolo</button></>
        )}
      </td>
      <td>
        <div className="row tight" style={{ flexWrap: 'nowrap' }}>
          <input type="email" placeholder="nome@lemonsintheroom.com" value={email} onChange={e => setEmail(e.target.value)} style={{ minWidth: 230 }} />
          <button className="btn sm" disabled={!emailValida || stato?.t === 'Invio…'} onClick={invita}>{entrato || m.invitato_il ? 'Reinvia' : 'Invita'}</button>
        </div>
        <div className="small" style={{ marginTop: 3, color: entrato ? '#047857' : undefined }}>{etichetta}</div>
        {stato && <div className={'small ' + (stato.ok ? '' : 'errtxt')}>{stato.t}</div>}
      </td>
      <td style={{ whiteSpace: 'nowrap' }}>
        {m.id !== me.id && <button className="btn ghost xs" onClick={toggleAdmin}>{m.is_admin ? 'Togli admin' : 'Rendi admin'}</button>}
        {m.id !== me.id && <button className="btn ghost xs danger" onClick={elimina}>Elimina</button>}
      </td>
    </tr>
  );
}

// ───────────────────────── Numeri aziendali ─────────────────────────
function Numeri({ me }) {
  const [facts, setFacts] = useState([]);
  const [nuovo, setNuovo] = useState(null);
  const carica = () => supabase.from('facts').select('*').order('automatico', { ascending: false }).order('etichetta').then(({ data }) => setFacts(data || []));
  useEffect(() => {
    carica();
    const ch = supabase.channel('facts-live').on('postgres_changes', { event: '*', schema: 'public', table: 'facts' }, carica).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  async function salva(f, campi) {
    const { error } = await supabase.from('facts').update(campi).eq('id', f.id);
    if (error) alert(error.message); else carica();
  }
  async function aggiungi(e) {
    e.preventDefault();
    const chiave = 'man_' + nuovo.etichetta.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_').slice(0, 50) + '_' + Date.now().toString(36);
    const conf = nuovo.fonte.trim() ? { confermato_da: me.id, confermato_il: new Date().toISOString(), stato: 'confermato' } : { stato: 'da_verificare' };
    const { error } = await supabase.from('facts').insert({ chiave, etichetta: nuovo.etichetta.trim(), valore: nuovo.valore.trim(), fonte: nuovo.fonte.trim() || null, automatico: false, ...conf });
    if (error) { alert(error.message); return; }
    setNuovo(null); carica();
  }
  async function elimina(f) {
    if (!confirm(`Eliminare «${f.etichetta}»?`)) return;
    await supabase.from('facts').delete().eq('id', f.id); carica();
  }

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <h3>Numeri aziendali</h3>
      <p className="small muted">
        Ogni numero ha uno stato: <b>✅ confermato</b> (l'AI lo usa), <b>🟡 provvisorio</b> (l'AI lo usa ma la bozza ti avvisa di controllarlo), <b>🔴 da verificare</b> (l'AI non lo usa).
        Quando cambi un valore, le bozze nuove usano subito quello nuovo; i post già scritti che lo usavano mostrano «numero cambiato».
      </p>
      <table className="tbl"><thead><tr><th>Dato</th><th>Valore</th><th>Fonte</th><th>Stato</th><th /></tr></thead><tbody>
        {facts.map(f => <RigaNumero key={f.id} f={f} me={me} salva={salva} elimina={elimina} />)}
      </tbody></table>
      {nuovo ? (
        <form className="row tight" onSubmit={aggiungi} style={{ marginTop: 10 }}>
          <input required placeholder="Dato (es. Tempo di sanificazione)" value={nuovo.etichetta} onChange={e => setNuovo({ ...nuovo, etichetta: e.target.value })} style={{ minWidth: 240 }} />
          <input required placeholder="Valore (es. 45 secondi)" value={nuovo.valore} onChange={e => setNuovo({ ...nuovo, valore: e.target.value })} />
          <input placeholder="Fonte (se la scrivi, il dato è confermato)" value={nuovo.fonte} onChange={e => setNuovo({ ...nuovo, fonte: e.target.value })} style={{ minWidth: 260 }} />
          <button className="btn sm">Aggiungi</button>
          <button type="button" className="btn ghost sm" onClick={() => setNuovo(null)}>Annulla</button>
        </form>
      ) : <button className="btn ghost sm" style={{ marginTop: 10 }} onClick={() => setNuovo({ etichetta: '', valore: '', fonte: '' })}>+ Aggiungi numero</button>}
    </div>
  );
}

function RigaNumero({ f, me, salva, elimina }) {
  const [ed, setEd] = useState(false);
  const [v, setV] = useState(f.valore || '');
  const [fo, setFo] = useState(f.fonte || '');
  const [et, setEt] = useState(f.etichetta || '');
  useEffect(() => { setV(f.valore || ''); setFo(f.fonte || ''); setEt(f.etichetta || ''); }, [f.valore, f.fonte, f.etichetta]);
  const stato = f.stato || (f.confermato_il ? 'confermato' : 'da_verificare');
  const ok = stato === 'confermato';

  if (f.automatico) return (
    <tr><td>{f.etichetta}</td><td><b>{f.valore}</b></td><td className="small muted">{f.fonte}</td>
      <td className="small" style={{ color: '#047857' }}>✓ automatico · {fmtData(f.calcolato_il)}</td><td /></tr>
  );
  if (ed) return (
    <tr>
      <td><input value={et} onChange={e => setEt(e.target.value)} /></td>
      <td><input value={v} onChange={e => setV(e.target.value)} /></td>
      <td><input value={fo} onChange={e => setFo(e.target.value)} placeholder="Fonte obbligatoria per confermare" /></td>
      <td colSpan={2} style={{ whiteSpace: 'nowrap' }}>
        <button className="btn sm" disabled={!v.trim() || !fo.trim()} onClick={() => { salva(f, { etichetta: et.trim(), valore: v.trim(), fonte: fo.trim(), confermato_da: me.id, confermato_il: new Date().toISOString(), note: null, stato: 'confermato' }); setEd(false); }}>Salva e conferma</button>
        <button className="btn ghost sm" disabled={!v.trim()} onClick={() => { salva(f, { etichetta: et.trim(), valore: v.trim(), fonte: fo.trim() || null, stato: f.stato === 'confermato' ? 'provvisorio' : (f.stato || 'da_verificare'), confermato_il: null, confermato_da: null }); setEd(false); }}>Salva senza confermare</button>
        <button className="btn ghost sm" onClick={() => setEd(false)}>Annulla</button>
      </td>
    </tr>
  );
  return (
    <tr>
      <td>{f.etichetta}</td><td><b>{f.valore}</b></td><td className="small">{f.fonte || '—'}</td>
      <td className="small">
        <select value={stato} onChange={e => salva(f, e.target.value === 'confermato' ? { stato: 'confermato', confermato_da: me.id, confermato_il: new Date().toISOString() } : { stato: e.target.value, confermato_il: null, confermato_da: null })}>
          <option value="confermato">✅ confermato</option><option value="provvisorio">🟡 provvisorio</option><option value="da_verificare">🔴 da verificare</option>
        </select>
        {ok && f.confermato_il && <div className="muted">{fmtData(f.confermato_il)}</div>}
        {f.note && <div className="muted">{f.note}</div>}
      </td>
      <td style={{ whiteSpace: 'nowrap' }}>
        <button className="btn ghost xs" onClick={() => setEd(true)}>Modifica</button>
        <button className="btn ghost xs danger" onClick={() => elimina(f)}>Elimina</button>
      </td>
    </tr>
  );
}

// ───────────────────────── Fonti (Notion + Insights) ─────────────────────────
function Fonti() {
  const [fonti, setFonti] = useState([]);
  const [kb, setKb] = useState({});
  const [log, setLog] = useState([]);
  const [busy, setBusy] = useState(null);
  const [msg, setMsg] = useState(null);
  const [nuova, setNuova] = useState(null);

  async function carica() {
    const [f, l, k] = await Promise.all([
      supabase.from('fonti_notion').select('*').order('ordine'),
            supabase.from('sync_log').select('*').eq('job', 'conoscenza').order('created_at', { ascending: false }).limit(6),
      supabase.from('knowledge_chunks').select('fonte,area').limit(5000),
    ]);
    setFonti(f.data || []); setLog(l.data || []);
    const per = {}; for (const r of k.data || []) { const n = r.fonte === 'notion' ? r.area : 'Lemons Insights'; per[n] = (per[n] || 0) + 1; }
    setKb(per);
  }
  useEffect(() => { carica(); }, []);

  async function aggiorna() {
    setBusy('sync'); setMsg(null);
    try {
      const d = await chiamaFunzione('sync-conoscenza', { forza: true });
      setMsg(d.saltato ? { t: d.saltato } : { ok: d.ok, t: d.ok ? `Insights aggiornato ✓ · ${d.insights ?? 0} studi` : 'Completato con errori: ' + (d.errori || []).join(' · ').slice(0, 300) });
    } catch (e) { setMsg({ t: e.message }); }
    await carica(); setBusy(null);
  }
  async function patch(f, campi) {
    const { error } = await supabase.from('fonti_notion').update(campi).eq('id', f.id);
    if (error) alert(error.message); else carica();
  }
  async function aggiungi(e) {
    e.preventDefault();
    const m = nuova.link.replace(/-/g, '').match(/[0-9a-f]{32}/i);
    if (!m) { alert('Non trovo l\'ID del database nel link. Copia il link del database da Notion (Condividi → Copia link).'); return; }
    const h = m[0].toLowerCase(); const id = `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
    const { error } = await supabase.from('fonti_notion').insert({ db_id: id, nome: nuova.nome.trim(), corpo: nuova.corpo, ordine: fonti.length + 1 });
    if (error) { alert(error.message); return; }
    setNuova(null); carica();
  }
  async function elimina(f) {
    if (!confirm(`Togliere «${f.nome}» dalle fonti? Le sue pagine escono dalla base di conoscenza al prossimo aggiornamento.`)) return;
    await supabase.from('fonti_notion').delete().eq('id', f.id); carica();
  }

  const ultimo = log[0];

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <h3>Base di conoscenza: Notion e Lemons Insights</h3>
      <p className="small muted">Una volta al giorno lo <b>script sul Mac</b> rilegge Lemons Insights e i database Notion attivi qui sotto: aggiunge le pagine nuove, aggiorna quelle cambiate e toglie quelle cancellate. «Aggiorna Insights ora» rilegge subito solo gli studi di Lemons Insights.
        Entra <b>solo</b> quello che è pubblicabile: niente CRM, contratti, gare o dati di pazienti.</p>

      <div className="row tight" style={{ margin: '8px 0' }}>
        <button className="btn" onClick={aggiorna} disabled={!!busy}>{busy === 'sync' ? 'Aggiorno…' : 'Aggiorna Insights ora'}</button>
        <span className="small muted">{ultimo ? `Ultimo aggiornamento: ${fmtData(ultimo.created_at)} ${ultimo.ok ? '✓' : '· con errori'}` : 'Mai aggiornato'}</span>
      </div>
      {msg && <div className={'small ' + (msg.ok ? '' : 'errtxt')} style={{ marginBottom: 8 }}>{msg.t}</div>}

      <table className="tbl"><thead><tr><th>Fonte</th><th>Documenti</th><th>Legge anche il testo delle pagine</th><th>Attiva</th><th /></tr></thead><tbody>
        <tr><td><b>Lemons Insights</b> <a className="small" href="https://insights.lemonsintheroom.com" target="_blank" rel="noreferrer">↗</a></td><td>{kb['Lemons Insights'] || 0}</td><td className="small muted">titolo, autori, disegno, abstract</td><td>sempre</td><td /></tr>
        {fonti.map(f => (
          <tr key={f.id} className={f.attivo ? '' : 'dim'}>
            <td><b>{f.nome}</b> <a className="small" href={`https://www.notion.so/${f.db_id.replace(/-/g, '')}`} target="_blank" rel="noreferrer">↗</a>
              {(f.filtro_campo || f.escludi_campo) && <div className="small muted">filtro: {[f.filtro_campo && `${f.filtro_campo} ~ ${f.filtro_regex}`, f.escludi_campo && `escludi ${f.escludi_campo} ~ ${f.escludi_regex}`].filter(Boolean).join(' · ')}</div>}</td>
            <td>{kb[f.nome] || 0}</td>
            <td><input type="checkbox" checked={f.corpo} onChange={() => patch(f, { corpo: !f.corpo })} /></td>
            <td><input type="checkbox" checked={f.attivo} onChange={() => patch(f, { attivo: !f.attivo })} /></td>
            <td><button className="btn ghost xs danger" onClick={() => elimina(f)}>Togli</button></td>
          </tr>
        ))}
      </tbody></table>
      {nuova ? (
        <form className="row tight" onSubmit={aggiungi} style={{ marginTop: 10 }}>
          <input required placeholder="Link del database Notion" value={nuova.link} onChange={e => setNuova({ ...nuova, link: e.target.value })} style={{ minWidth: 320 }} />
          <input required placeholder="Nome (es. Case study)" value={nuova.nome} onChange={e => setNuova({ ...nuova, nome: e.target.value })} />
          <label className="small"><input type="checkbox" checked={nuova.corpo} onChange={e => setNuova({ ...nuova, corpo: e.target.checked })} /> leggi anche il testo</label>
          <button className="btn sm">Aggiungi</button>
          <button type="button" className="btn ghost sm" onClick={() => setNuova(null)}>Annulla</button>
          <div className="small muted" style={{ width: '100%' }}>Il database deve essere condiviso con l'integrazione Notion usata dallo script sul Mac (in Notion: ••• → Connessioni). Entra al prossimo giro dello script.</div>
        </form>
      ) : <button className="btn ghost sm" style={{ marginTop: 10 }} onClick={() => setNuova({ link: '', nome: '', corpo: false })}>+ Aggiungi database Notion</button>}

    </div>
  );
}
