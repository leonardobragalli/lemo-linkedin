import { useEffect, useMemo, useState } from 'react';
import { supabase, supabaseUrl } from '../supabase.js';
import { fmtData, primaRiga } from '../lib/util.js';

const NOMI_DIM = {
  tipo_apertura: 'Tipo di apertura', fascia: 'Fascia oraria', giorno: 'Giorno', formato: 'Formato',
  numero_in_apertura: 'Numero nelle prime righe', chiude_con_domanda: 'Chiude con una domanda', layout_grafico: 'Impaginazione grafica',
};
const GIORNI = { 1: 'Lunedì', 2: 'Martedì', 3: 'Mercoledì', 4: 'Giovedì', 5: 'Venerdì', 6: 'Sabato', 7: 'Domenica' };
const etichetta = (d, v) => d === 'giorno' ? GIORNI[v] || v : v === 'true' ? 'sì' : v === 'false' ? 'no' : d === 'layout_grafico' ? `modello ${Number(v) + 1}` : v;

export default function Impara({ members, posts, me, apri }) {
  const [pb, setPb] = useState([]);
  const [kb, setKb] = useState({ tot: 0, per: {} });
  const [facts, setFacts] = useState([]);
  const [sync, setSync] = useState([]);
  const [ambito, setAmbito] = useState('team');
  const [busy, setBusy] = useState(null);

  async function carica() {
    const [p, f, s] = await Promise.all([
      supabase.from('playbook').select('*').order('versione', { ascending: false }),
      supabase.from('facts').select('*').order('chiave'),
      supabase.from('sync_log').select('*').order('created_at', { ascending: false }).limit(12),
    ]);
    setPb(p.data || []); setFacts(f.data || []); setSync(s.data || []);
    const per = {};
    for (const fonte of ['insights_studio', 'notion']) {
      const { count } = await supabase.from('knowledge_chunks').select('id', { count: 'exact', head: true }).eq('fonte', fonte);
      per[fonte] = count || 0;
    }
    setKb({ tot: Object.values(per).reduce((a, b) => a + b, 0), per });
  }
  useEffect(() => { let v = true; carica().then(() => { if (!v) return; }); return () => { v = false; }; }, []);

  const corrente = useMemo(() => pb.find(p => p.ambito === ambito), [pb, ambito]);
  const c = corrente?.contenuto || {};
  const postById = useMemo(() => Object.fromEntries(posts.map(p => [p.id, p])), [posts]);

  async function ricalcola() {
    setBusy('playbook');
    await supabase.rpc('ricalcola_playbook');
    await carica(); setBusy(null);
  }
  async function aggiornaFonti() {
    setBusy('fonti');
    const { data: s } = await supabase.auth.getSession();
    await fetch(`${supabaseUrl}/functions/v1/sync-conoscenza`, { method: 'POST', headers: { Authorization: `Bearer ${s.session.access_token}`, 'Content-Type': 'application/json' }, body: '{}' });
    await carica(); setBusy(null);
  }
  async function escludi(id) {
    if (!confirm("Non usare più questo post come esempio per l'AI? (il playbook si ricalcola)")) return;
    const { error } = await supabase.from('posts').update({ usa_come_esempio: false }).eq('id', id);
    if (error) { alert(error.message); return; }
    await carica();
  }
  const puo = id => me.is_admin || postById[id]?.member_id === me.id;
  async function conferma(f) {
    const valore = prompt(`Valore confermato per «${f.etichetta}» (lascia vuoto per annullare):`, f.valore || '');
    if (!valore) return;
    const fonte = prompt('Fonte del dato (documento, SOP, dashboard…):', '');
    if (!fonte) return;
    await supabase.from('facts').update({ valore, fonte, confermato_da: me.id, confermato_il: new Date().toISOString(), note: null }).eq('id', f.id);
    carica();
  }

  return (
    <section>
      <div className="toolbar">
        <h2>Cosa sta imparando</h2>
        <select value={ambito} onChange={e => setAmbito(e.target.value)}>
          <option value="team">Tutto il team</option>
          {members.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
        </select>
        <button className="btn ghost sm" onClick={ricalcola} disabled={!!busy}>{busy === 'playbook' ? 'Ricalcolo…' : 'Ricalcola ora'}</button>
        <span className="muted small">{corrente ? `Versione ${corrente.versione} · ${fmtData(corrente.created_at)} · ${c.post_con_dati} post con dati` : 'Nessun dato'}</span>
      </div>

      <div className="card info">
        Ogni notte la piattaforma confronta ogni post con la <b>media dell'autore</b> (1,0× = nella norma) e aggiorna queste regole.
        Le bozze AI le usano: imitano i post migliori, evitano gli schemi peggiori, imparano dalle vostre correzioni e una bozza su cinque prova apposta qualcosa di nuovo.
        Un confronto conta solo con almeno {c.soglia_gruppo || 5} post per gruppo: sotto, è grigio e vale solo come indizio.
      </div>

      <div className="dims">
        {Object.entries(c.dimensioni || {}).map(([d, v]) => (
          <div className="card" key={d}>
            <h3>{NOMI_DIM[d] || d} {!v.affidabile && <span className="badge ghost">dati insufficienti</span>}</h3>
            <table className="tbl"><tbody>{(v.gruppi || []).map(g => (
              <tr key={g.valore} className={g.post >= (c.soglia_gruppo || 5) ? '' : 'dim'}>
                <td>{etichetta(d, g.valore)}</td><td className="small muted">{g.post} post</td>
                <td><span className="bar"><span style={{ width: Math.min(100, g.indice / 3 * 100) + '%', background: g.indice >= 1 ? '#16A34A' : '#F59E0B' }} /><em>{String(g.indice).replace('.', ',')}×</em></span></td>
              </tr>
            ))}</tbody></table>
          </div>
        ))}
      </div>

      <div className="dims">
        <div className="card">
          <h3>Esempi che l'AI imita</h3>
          {(c.migliori || []).map(id => postById[id] && <div key={id} className="row tight small" style={{ padding: '3px 0', flexWrap: 'nowrap' }}><span style={{ cursor: 'pointer', flex: 1 }} onClick={() => apri(id)}>▲ {members.find(m => m.id === postById[id].member_id)?.nome_breve}: {primaRiga(postById[id].testo).slice(0, 90)}</span>{puo(id) && <button className="btn ghost xs" title="Non usare come esempio" onClick={() => escludi(id)}>✕</button>}</div>)}
          <h3 style={{ marginTop: 12 }}>Schemi che evita</h3>
          {(c.peggiori || []).map(id => postById[id] && <div key={id} className="row tight small muted" style={{ padding: '3px 0', flexWrap: 'nowrap' }}><span style={{ cursor: 'pointer', flex: 1 }} onClick={() => apri(id)}>▼ {primaRiga(postById[id].testo).slice(0, 90)}</span>{puo(id) && <button className="btn ghost xs" title="Non usare come esempio" onClick={() => escludi(id)}>✕</button>}</div>)}
          <p className="small muted">Post personali o fuori tema (anniversari, ricerca di lavoro…) si tolgono con ✕: non sono esempi di stile per il team.</p>
          {c.correzioni_autore?.n > 0 && <p className="small">Bozze AI corrette dagli autori: {c.correzioni_autore.n} (lunghezza finale ≈ {c.correzioni_autore.rapporto_lunghezza}× la bozza).</p>}
        </div>

        <div className="card">
          <h3>Base di conoscenza</h3>
          <p className="small">{kb.tot} documenti: {kb.per.insights_studio || 0} studi da Lemons Insights · {kb.per.notion || 0} pagine Notion (paper, press, blog, procedure, esperienze, post passati).</p>
          {!kb.per.notion && <p className="small errtxt">Notion non ancora collegato{me.is_admin ? ': chiave e database si gestiscono in Impostazioni.' : '.'}</p>}
          <button className="btn ghost sm" onClick={aggiornaFonti} disabled={!!busy}>{busy === 'fonti' ? 'Aggiorno…' : 'Aggiorna Insights ora'}</button>
          <table className="tbl" style={{ marginTop: 10 }}><tbody>{sync.map(s => (
            <tr key={s.id}><td className="small">{fmtData(s.created_at)}</td><td className="small">{s.job}</td><td>{s.ok ? '✓' : <span className="errtxt">errore</span>}</td>
              <td className="small muted">{s.dettagli && JSON.stringify(s.dettagli).slice(0, 90)}</td></tr>
          ))}</tbody></table>
        </div>

        <div className="card">
          <h3>Numeri aziendali</h3>
          <p className="small muted">L'AI usa un numero aziendale solo se un admin l'ha confermato con la fonte.{me.is_admin && <> Si modificano in <a href="#impostazioni" onClick={() => setTimeout(() => location.reload(), 0)}>Impostazioni</a>.</>}</p>
          <table className="tbl"><tbody>{facts.map(f => (
            <tr key={f.id}>
              <td>{f.etichetta}</td><td><b>{f.valore}</b></td>
              <td className="small">{f.confermato_il ? <span style={{ color: '#047857' }}>✓ {f.fonte}</span> : <span className="errtxt">{f.note || 'DA VERIFICARE'}</span>}</td>
            </tr>
          ))}</tbody></table>
        </div>
      </div>
    </section>
  );
}
