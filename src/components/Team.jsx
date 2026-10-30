import { useState } from 'react';
import { supabase } from '../supabase.js';
import { fmtData, oggiYmd } from '../lib/util.js';
import { bannerProfilo } from '../lib/grafica.js';

export default function Team({ members, memberMetrics, posts, me, applica }) {
  return (
    <section>
      <div className="toolbar"><h2>Team & follower</h2><span className="muted small">Aggiornate i follower una volta a settimana (dal vostro profilo LinkedIn).</span></div>
      <div className="grid team">
        {members.map(m => <Membro key={m.id} m={m} storico={memberMetrics.filter(x => x.member_id === m.id)} posts={posts.filter(p => p.member_id === m.id)} me={me} applica={applica} />)}
      </div>
    </section>
  );
}

function Membro({ m, storico, posts, me, applica }) {
  const puo = m.id === me.id || me.is_admin;
  const ult = [...storico].sort((a, b) => (a.captured_on < b.captured_on ? 1 : -1));
  const [fol, setFol] = useState('');
  const [email, setEmail] = useState(m.email || '');
  const [err, setErr] = useState(null);
  const [banner, setBanner] = useState(null);
  const pub = posts.filter(p => p.stato === 'pubblicato').length;
  const daFare = posts.filter(p => p.stato === 'da_rivedere' || p.stato === 'approvato').length;
  const delta = ult.length >= 2 && ult[0].followers != null && ult[1].followers != null ? ult[0].followers - ult[1].followers : null;

  async function salvaFollower(e) {
    e.preventDefault();
    const n = parseInt(fol, 10); if (!(n >= 0)) return;
    const { data, error } = await supabase.from('member_metrics').upsert({ member_id: m.id, captured_on: oggiYmd(), followers: n, fonte: 'manuale', entered_by: me.id }, { onConflict: 'member_id,captured_on' }).select().single();
    if (error) { setErr(error.message); return; }
    applica('member_metrics', data); setFol(''); setErr(null);
  }
  async function salvaEmail() {
    const v = email.trim().toLowerCase() || null;
    const { data, error } = await supabase.from('team_members').update({ email: v }).eq('id', m.id).select().single();
    if (error) { setErr(error.message); return; }
    applica('team_members', data); setErr(null);
  }
  async function toggleAdmin() {
    const { data, error } = await supabase.from('team_members').update({ is_admin: !m.is_admin }).eq('id', m.id).select().single();
    if (error) { setErr(error.message); return; }
    applica('team_members', data);
  }

  return (
    <div className="card member" style={{ borderTopColor: m.colore }}>
      <div className="row tight">
        <img className="av lg" src={`/avatars/${m.id}.jpg`} alt="" />
        <div><b>{m.nome}</b>{m.is_admin && <span className="badge ghost">admin</span>}<div className="small muted">{m.ruolo}</div></div>
      </div>
      <div className="kpis">
        <div><b>{ult[0]?.followers?.toLocaleString('it-IT') ?? '—'}</b><span>follower{delta != null && <em className={delta >= 0 ? 'up' : 'down'}> {delta >= 0 ? '+' : ''}{delta}</em>}</span></div>
        <div><b>{pub}</b><span>pubblicati</span></div>
        <div><b>{daFare}</b><span>in coda</span></div>
      </div>
      <div className="small muted">Ultimo dato: {ult[0] ? fmtData(ult[0].captured_on + 'T12:00:00Z', false) : '—'}</div>
      {m.linkedin_url && <a className="small" href={m.linkedin_url} target="_blank" rel="noreferrer">Profilo LinkedIn ↗</a>}
      {puo && (
        <form className="row tight" onSubmit={salvaFollower}>
          <input type="number" min="0" placeholder="Follower di oggi" value={fol} onChange={e => setFol(e.target.value)} />
          <button className="btn sm">Salva</button>
        </form>
      )}
      {me.is_admin && (
        <div className="row tight">
          <input type="email" placeholder="email DA CHIEDERE" value={email} onChange={e => setEmail(e.target.value)} />
          <button className="btn ghost sm" onClick={salvaEmail} disabled={(m.email || '') === email.trim().toLowerCase()}>Salva email</button>
          {m.id !== me.id && <button className="btn ghost sm" onClick={toggleAdmin}>{m.is_admin ? 'Togli admin' : 'Rendi admin'}</button>}
        </div>
      )}
      {!m.email && <div className="small errtxt">Nessuna email: non può ancora entrare.</div>}
      {puo && <div className="row tight"><button className="btn ghost xs" onClick={async () => setBanner(await bannerProfilo(m, 1, m.id === 'lazar' ? 'en' : 'it'))}>Genera banner profilo</button>
        {banner && <a className="small" href={banner} download={`Banner_${m.id}.jpg`}>↓ scarica</a>}</div>}
      {banner && <img className="banner-img" src={banner} alt="banner" />}
      {err && <div className="errtxt small">{err}</div>}
    </div>
  );
}
