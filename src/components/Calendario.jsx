import { useMemo, useState } from 'react';
import { avatar, STATI, partiRoma, fmtData, lunediDi, addGiorni, oggiYmd, primaRiga, GIORNI_LUNGHI } from '../lib/util.js';

export function Chip({ post, member, onClick, compatto }) {
  const st = STATI[post.stato];
  const p = partiRoma(post.scheduled_at);
  const inRitardo = post.stato !== 'pubblicato' && post.stato !== 'scartato' && post.scheduled_at && new Date(post.scheduled_at) < new Date();
  return (
    <button className="chip" style={{ borderLeftColor: member?.colore || '#999' }} onClick={onClick} title={primaRiga(post.testo)}>
      <div className="chip-top">
        <img className="av xs" src={avatar(post.member_id)} alt="" />
        <b>{p ? `${p.hh}:${p.mm}` : '—'}</b>
        <span className="muted">{member?.nome_breve || post.member_id}</span>
      </div>
      {!compatto && <div className="chip-txt">{primaRiga(post.testo).slice(0, 90)}</div>}
      <div className="chip-bot">
        <span className="badge" style={{ color: st.color, background: st.bg }}>{st.label}</span>
        {inRitardo && <span className="badge warn">Data passata</span>}
        {post.is_riserva && <span className="badge ghost">Riserva</span>}
        {post.slot && <span className="muted small">#{post.slot}</span>}
      </div>
    </button>
  );
}

export default function Calendario({ posts, members, me, apri }) {
  const [lunedi, setLunedi] = useState(() => lunediDi(oggiYmd()));
  const [filtro, setFiltro] = useState('tutti');
  const [mostraScartati, setMostraScartati] = useState(false);
  const mById = useMemo(() => Object.fromEntries(members.map(m => [m.id, m])), [members]);

  const giorni = Array.from({ length: 7 }, (_, i) => addGiorni(lunedi, i));
  const perGiorno = useMemo(() => {
    const g = Object.fromEntries(giorni.map(d => [d, []]));
    for (const p of posts) {
      if (p.origine === 'storico') continue;
      if (!mostraScartati && p.stato === 'scartato') continue;
      if (filtro !== 'tutti' && p.member_id !== filtro) continue;
      const when = p.stato === 'pubblicato' ? p.published_at || p.scheduled_at : p.scheduled_at;
      const r = partiRoma(when);
      if (r && g[r.ymd]) g[r.ymd].push({ ...p, scheduled_at: when });
    }
    for (const d of Object.keys(g)) g[d].sort((a, b) => (a.scheduled_at < b.scheduled_at ? -1 : 1));
    return g;
  }, [posts, filtro, mostraScartati, lunedi]); // eslint-disable-line

  const oggi = oggiYmd();
  const settimana = giorni.flatMap(d => perGiorno[d]);
  const conteggi = Object.fromEntries(Object.keys(STATI).map(k => [k, settimana.filter(p => p.stato === k).length]));

  return (
    <section>
      <div className="toolbar">
        <button className="btn ghost sm" onClick={() => setLunedi(addGiorni(lunedi, -7))}>← Settimana prima</button>
        <button className="btn ghost sm" onClick={() => setLunedi(lunediDi(oggiYmd()))}>Oggi</button>
        <button className="btn ghost sm" onClick={() => setLunedi(addGiorni(lunedi, 7))}>Settimana dopo →</button>
        <h2>{fmtData(giorni[0] + 'T12:00:00Z', false)} – {fmtData(giorni[6] + 'T12:00:00Z', false)}</h2>
        <select value={filtro} onChange={e => setFiltro(e.target.value)}>
          <option value="tutti">Tutto il team</option>
          {members.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
        </select>
        <label className="small"><input type="checkbox" checked={mostraScartati} onChange={e => setMostraScartati(e.target.checked)} /> scartati</label>
        <span className="muted small">{settimana.length} post · {Object.entries(conteggi).filter(([, n]) => n).map(([k, n]) => `${n} ${STATI[k].label.toLowerCase()}`).join(' · ')}</span>
      </div>
      <div className="week">
        {giorni.map(d => {
          const r = partiRoma(d + 'T12:00:00Z');
          return (
            <div key={d} className={'day' + (d === oggi ? ' today' : '') + (r.dow === 0 || r.dow === 6 ? ' we' : '')}>
              <div className="day-h">{GIORNI_LUNGHI[r.dow]} <b>{r.d}</b></div>
              {perGiorno[d].length === 0 && <div className="muted small pad">—</div>}
              {perGiorno[d].map(p => (
                <Chip key={p.id} post={p} member={mById[p.member_id]} onClick={() => apri(p.id)} />
              ))}
            </div>
          );
        })}
      </div>
      <p className="muted small">Clicca un post per aprirlo. Puoi modificare i tuoi post{me.is_admin ? ' e, da admin, quelli di tutti' : ''}; gli altri li vedi in sola lettura.</p>
    </section>
  );
}
