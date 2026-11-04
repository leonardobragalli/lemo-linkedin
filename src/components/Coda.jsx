import { useMemo, useState } from 'react';
import { supabase, supabaseUrl } from '../supabase.js';
import { STATI } from '../lib/util.js';
import { Chip } from './Calendario.jsx';

export default function Coda({ posts, members, me, apri, applica }) {
  const [chi, setChi] = useState(me.id);
  const [stato, setStato] = useState('attivi');
  const mById = useMemo(() => Object.fromEntries(members.map(m => [m.id, m])), [members]);
  const lista = posts
    .filter(p => p.member_id === chi && p.origine !== 'storico')
    .filter(p => (stato === 'attivi' ? p.stato === 'da_rivedere' || p.stato === 'approvato' : stato === 'tutti' ? true : p.stato === stato))
    .sort((a, b) => ((a.scheduled_at || '') < (b.scheduled_at || '') ? -1 : 1));
  const puoCreare = chi === me.id || me.is_admin;
  const [gen, setGen] = useState(null);   // null | {tema, istruzioni, busy, err}

  async function generaBozza() {
    setGen(g => ({ ...g, busy: true, err: null }));
    const { data: s } = await supabase.auth.getSession();
    const r = await fetch(`${supabaseUrl}/functions/v1/genera-bozza`, {
      method: 'POST', headers: { Authorization: `Bearer ${s.session.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ member_id: chi, tema: gen.tema, istruzioni: gen.istruzioni }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setGen(g => ({ ...g, busy: false, err: j.error || `Errore ${r.status}` })); return; }
    applica('posts', j.post); setGen(null); apri(j.post.id);
  }

  async function nuovo() {
    const { data, error } = await supabase.from('posts').insert({ member_id: chi, origine: 'nuovo', testo: '', titolo: 'Nuovo post', formato: 'testo', stato: 'da_rivedere' }).select().single();
    if (error) { alert(error.message); return; }
    applica('posts', data); apri(data.id);
  }

  return (
    <section>
      <div className="toolbar">
        <select value={chi} onChange={e => setChi(e.target.value)}>
          {members.map(m => <option key={m.id} value={m.id}>{m.id === me.id ? `${m.nome} (tu)` : m.nome}</option>)}
        </select>
        <select value={stato} onChange={e => setStato(e.target.value)}>
          <option value="attivi">Da pubblicare</option>
          {Object.entries(STATI).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          <option value="tutti">Tutti</option>
        </select>
        <span className="muted small">{lista.length} post</span>
        {puoCreare && <button className="btn orange sm" onClick={() => setGen({ tema: '', istruzioni: '' })}>✨ Genera bozza con AI</button>}
        {puoCreare && <button className="btn ghost sm" onClick={nuovo}>+ Post vuoto</button>}
      </div>
      {gen && (
        <div className="card">
          <h3>Nuova bozza AI per {members.find(m => m.id === chi)?.nome}</h3>
          <p className="small muted">Usa le regole apprese dai dati, i post migliori come esempio e gli studi della base di conoscenza. Ogni numero senza fonte viene segnato DA VERIFICARE. La bozza resta «da rivedere» finché non la approvi.</p>
          <div className="row">
            <label style={{ flex: 1 }}>Tema (facoltativo) <input value={gen.tema} onChange={e => setGen({ ...gen, tema: e.target.value })} placeholder="es. ansia prima dei prelievi in pediatria" /></label>
          </div>
          <label>Istruzioni (facoltative) <textarea rows={2} value={gen.istruzioni} onChange={e => setGen({ ...gen, istruzioni: e.target.value })} placeholder="es. racconta la consegna di ieri al Meyer, tono pratico" /></label>
          <div className="row tight" style={{ marginTop: 8 }}>
            <button className="btn orange sm" disabled={gen.busy} onClick={generaBozza}>{gen.busy ? 'Scrivo… (10-30 s)' : 'Genera'}</button>
            <button className="btn ghost sm" onClick={() => setGen(null)}>Annulla</button>
            {gen.err && <span className="errtxt small">{gen.err}</span>}
          </div>
        </div>
      )}
      <div className="grid">
        {lista.map(p => <Chip key={p.id} post={p} member={mById[p.member_id]} onClick={() => apri(p.id)} />)}
      </div>
      {!lista.length && <p className="muted">Nessun post in questo filtro.</p>}
    </section>
  );
}
