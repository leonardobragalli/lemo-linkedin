import { useMemo, useState } from 'react';
import { righePubblicate, perDimensione, DIMENSIONI, suggerimenti, MIN_GRUPPO, MIN_BASELINE } from '../lib/insights.js';
import { fmtData, primaRiga } from '../lib/util.js';

const pct = x => (x == null ? '—' : (x * 100).toFixed(1).replace('.', ',') + '%');
const num = x => (x == null ? '—' : Math.round(x).toLocaleString('it-IT'));

export default function Analisi({ posts, metrics, members, apri }) {
  const [chi, setChi] = useState('tutti');
  const mById = useMemo(() => Object.fromEntries(members.map(m => [m.id, m])), [members]);
  const { rows, base } = useMemo(() => righePubblicate(posts, metrics), [posts, metrics]);
  const sel = chi === 'tutti' ? rows : rows.filter(r => r.member_id === chi);
  const conIndice = sel.filter(r => r.indice != null);
  const tips = suggerimenti(conIndice);
  const top = [...conIndice].sort((a, b) => b.indice - a.indice).slice(0, 5);
  const conImpr = sel.filter(r => r.impr);

  return (
    <section>
      <div className="toolbar">
        <h2>Cosa funziona</h2>
        <select value={chi} onChange={e => setChi(e.target.value)}>
          <option value="tutti">Tutto il team</option>
          {members.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
        </select>
        <span className="muted small">{sel.length} post pubblicati con dati · {conImpr.length} con impressioni</span>
      </div>

      <div className="card info">
        <b>Come leggo i dati.</b> Ognuno di noi ha un pubblico diverso (da 136 a oltre 4.000 follower), quindi ogni post è confrontato con la <b>mediana dei post dello stesso autore</b>: indice 1,0 = nella norma per lui/lei, 2,0 = il doppio.
        Interazioni = reazioni + commenti + diffusioni. Un gruppo conta solo con almeno {MIN_GRUPPO} post; sotto, il dato è mostrato ma non uso per suggerire nulla.
        Autori con meno di {MIN_BASELINE} post con dati non hanno ancora una media.
      </div>

      <div className="card">
        <h3>Suggerimenti dai dati</h3>
        {tips.length ? <ul>{tips.map((t, i) => <li key={i}>{t}</li>)}</ul>
          : <p className="muted">Ancora pochi dati per conclusioni affidabili. Registrate i numeri di ogni post pubblicato (a 24h, 72h e 7 giorni): i suggerimenti compaiono da soli quando i gruppi arrivano a {MIN_GRUPPO} post.</p>}
      </div>

      <div className="dims">
        {DIMENSIONI.map(d => {
          const { gruppi } = perDimensione(conIndice, d.key);
          return (
            <div className="card" key={d.key}>
              <h3>{d.label}</h3>
              {!gruppi.length ? <p className="muted small">Nessun dato.</p> : (
                <table className="tbl">
                  <thead><tr><th /><th>Post</th><th>Indice</th><th>Interaz. medie</th><th>Tasso su impressioni</th></tr></thead>
                  <tbody>{gruppi.map(g => (
                    <tr key={g.chiave} className={g.affidabile ? '' : 'dim'}>
                      <td>{g.chiave}</td><td>{g.n}{!g.affidabile && <span className="muted small"> · pochi</span>}</td>
                      <td><Barra v={g.indice} /></td><td>{num(g.eng)}</td><td>{g.nRate ? `${pct(g.rate)} (${g.nRate})` : '—'}</td>
                    </tr>
                  ))}</tbody>
                </table>
              )}
            </div>
          );
        })}
      </div>

      <div className="card">
        <h3>Post migliori rispetto alla media dell'autore</h3>
        <table className="tbl">
          <thead><tr><th>Autore</th><th>Data</th><th>Apertura</th><th>Interaz.</th><th>Impress.</th><th>Indice</th></tr></thead>
          <tbody>{top.map(r => (
            <tr key={r.post.id} className="click" onClick={() => apri(r.post.id)}>
              <td>{mById[r.member_id]?.nome_breve}</td><td>{fmtData(r.post.published_at)}</td>
              <td>{primaRiga(r.post.testo).slice(0, 70)}</td><td>{r.eng}</td><td>{num(r.impr)}</td><td><Barra v={r.indice} /></td>
            </tr>
          ))}</tbody>
        </table>
      </div>

      <div className="card">
        <h3>Media per autore (base del confronto)</h3>
        <table className="tbl">
          <thead><tr><th>Autore</th><th>Post con dati</th><th>Mediana interazioni</th></tr></thead>
          <tbody>{members.map(m => {
            const n = rows.filter(r => r.member_id === m.id).length;
            return <tr key={m.id}><td>{m.nome}</td><td>{n}</td><td>{base[m.id] != null ? num(base[m.id]) : <span className="muted small">servono {MIN_BASELINE} post</span>}</td></tr>;
          })}</tbody>
        </table>
        <p className="small muted">Dati iniziali importati dal kit il 28/10: per i post precedenti al piano ci sono solo reazioni e commenti pubblici; impressioni solo per Matteo.</p>
      </div>
    </section>
  );
}

function Barra({ v }) {
  if (v == null) return '—';
  const w = Math.min(100, (v / 3) * 100);
  return <span className="bar"><span style={{ width: w + '%', background: v >= 1 ? '#16A34A' : '#F59E0B' }} /><em>{v.toFixed(2).replace('.', ',')}×</em></span>;
}
