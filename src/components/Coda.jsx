import { useMemo, useState } from 'react';
import { supabase } from '../supabase.js';
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
        {puoCreare && <button className="btn sm" onClick={nuovo}>+ Nuovo post</button>}
      </div>
      <div className="grid">
        {lista.map(p => <Chip key={p.id} post={p} member={mById[p.member_id]} onClick={() => apri(p.id)} />)}
      </div>
      {!lista.length && <p className="muted">Nessun post in questo filtro.</p>}
    </section>
  );
}
