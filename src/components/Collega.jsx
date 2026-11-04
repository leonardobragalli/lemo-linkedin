import { useEffect, useState } from 'react';
import { supabase } from '../supabase.js';
import { asset, fmtData } from '../lib/util.js';

const URL_SCRIPT = () => new URL(asset('lemo-linkedin.user.js'), location.href).href;

export default function Collega({ me, members }) {
  const [codice, setCodice] = useState(null);
  const [tokens, setTokens] = useState([]);
  const [log, setLog] = useState([]);
  const [err, setErr] = useState(null);

  async function carica() {
    const [t, l] = await Promise.all([
      supabase.from('member_tokens').select('id,member_id,etichetta,created_at,last_used_at,revoked_at').order('created_at', { ascending: false }),
      supabase.from('ingest_log').select('*').order('created_at', { ascending: false }).limit(30),
    ]);
    setTokens(t.data || []); setLog(l.data || []);
  }
  useEffect(() => {
    let vivo = true;
    carica().then(() => { if (!vivo) return; });
    const ch = supabase.channel('ingest-live').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ingest_log' }, p => setLog(x => [p.new, ...x].slice(0, 30))).subscribe();
    return () => { vivo = false; supabase.removeChannel(ch); };
  }, []);

  async function genera() {
    setErr(null);
    const nav = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent) ? 'Safari' : 'Chrome';
    const { data, error } = await supabase.rpc('crea_codice_collegamento', { etichetta: `${nav} · ${new Date().toLocaleDateString('it-IT')}` });
    if (error) { setErr(error.message); return; }
    setCodice(data); carica();
  }
  async function revoca(id) {
    if (!confirm('Revocare questo codice? Lo script che lo usa smette di inviare dati.')) return;
    await supabase.from('member_tokens').update({ revoked_at: new Date().toISOString() }).eq('id', id);
    carica();
  }
  const miei = tokens.filter(t => t.member_id === me.id);
  const nome = id => members.find(m => m.id === id)?.nome_breve || id;
  const attivi = new Set(tokens.filter(t => !t.revoked_at && t.last_used_at).map(t => t.member_id));

  return (
    <section>
      <div className="toolbar"><h2>Collega il tuo LinkedIn</h2><span className="muted small">Una volta sola, 3 minuti. Poi i dati dei tuoi post arrivano da soli.</span></div>

      <div className="card info">
        <b>Come funziona.</b> Un piccolo script nel tuo browser, quando apri LinkedIn, legge <b>solo le statistiche dei tuoi post</b> (impressioni, reazioni, commenti, diffusioni, follower) e le manda qui.
        Non fa nessuna azione su LinkedIn (niente like, inviti, messaggi), non legge profili altrui e si ferma se LinkedIn chiede una verifica.
        Formalmente questo tipo di lettura automatica non è previsto dai termini di LinkedIn: il rischio è basso (pochi dati, solo tuoi) ma non zero.
        Se non apri LinkedIn per qualche giorno, i tuoi dati restano fermi fino al prossimo accesso.
      </div>

      <div className="dims">
        <div className="card">
          <h3>1 · Installa il gestore di script</h3>
          <p><b>Chrome / Edge:</b> estensione gratuita <a href="https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo" target="_blank" rel="noreferrer">Tampermonkey</a> → «Aggiungi». Poi in <code>chrome://extensions</code> apri i dettagli di Tampermonkey e attiva «Consenti script utente» (nelle versioni meno recenti: «Modalità sviluppatore» in alto a destra).</p>
          <p><b>Safari (Mac):</b> app gratuita <a href="https://apps.apple.com/app/userscripts/id1463298887" target="_blank" rel="noreferrer">Userscripts</a> dall'App Store → aprila una volta → Safari ▸ Impostazioni ▸ Estensioni ▸ attiva «Userscripts» e consenti su <i>linkedin.com</i>.</p>
        </div>
        <div className="card">
          <h3>2 · Installa lo script</h3>
          <p>Apri questo link <b>nel browser dove usi LinkedIn</b>: il gestore ti chiede «Installa».</p>
          <p><a className="btn sm" href={URL_SCRIPT()} target="_blank" rel="noreferrer">Installa lo script LEMO</a></p>
          <p className="small muted">Si aggiorna da solo quando miglioriamo la lettura.</p>
        </div>
        <div className="card">
          <h3>3 · Collega con il tuo codice</h3>
          <button className="btn sm" onClick={genera}>Genera il mio codice</button>
          {codice && (
            <div style={{ marginTop: 10 }}>
              <p className="small">Copialo ora (non lo rivedrai): apri LinkedIn, in basso a destra compare il riquadro 🍋, incollalo e premi Salva.</p>
              <div className="row tight"><input readOnly value={codice} style={{ flex: 1, fontFamily: 'monospace' }} onFocus={e => e.target.select()} />
                <button className="btn ghost sm" onClick={() => navigator.clipboard.writeText(codice)}>Copia</button></div>
            </div>
          )}
          {err && <p className="errtxt small">{err}</p>}
          {miei.length > 0 && (
            <table className="tbl" style={{ marginTop: 10 }}>
              <thead><tr><th>Codice</th><th>Creato</th><th>Ultimo invio</th><th /></tr></thead>
              <tbody>{miei.map(t => (
                <tr key={t.id}><td>{t.etichetta}</td><td>{fmtData(t.created_at)}</td><td>{t.last_used_at ? fmtData(t.last_used_at) : '—'}</td>
                  <td>{t.revoked_at ? <span className="muted small">revocato</span> : <button className="btn ghost xs" onClick={() => revoca(t.id)}>Revoca</button>}</td></tr>
              ))}</tbody>
            </table>
          )}
        </div>
      </div>

      <div className="card">
        <h3>Chi è collegato</h3>
        <div className="row tight">{members.map(m => <span key={m.id} className="badge" style={{ background: attivi.has(m.id) ? '#D1FAE5' : '#F3F4F6', color: attivi.has(m.id) ? '#047857' : '#6B7280' }}>{m.nome_breve || m.nome}{attivi.has(m.id) ? ' ✓' : ''}</span>)}</div>
      </div>

      <div className="card">
        <h3>Ultimi invii dagli script</h3>
        {!log.length ? <p className="muted small">Ancora nessun invio.</p> : (
          <table className="tbl">
            <thead><tr><th>Quando</th><th>Chi</th><th>Post letti</th><th>Abbinati</th><th>Nuovi</th><th>Rilevazioni</th><th>Follower</th><th>Errori</th></tr></thead>
            <tbody>{log.map(l => (
              <tr key={l.id}><td>{fmtData(l.created_at)}</td><td>{nome(l.member_id)}</td><td>{l.post_visti}</td><td>{l.post_abbinati}</td><td>{l.post_nuovi}</td><td>{l.metriche_scritte}</td><td>{l.followers ?? '—'}</td>
                <td className="small">{(l.errori || []).length ? <span className="errtxt" title={(l.errori || []).join('\n')}>{l.errori.length}</span> : '0'}</td></tr>
            ))}</tbody>
          </table>
        )}
      </div>
    </section>
  );
}
