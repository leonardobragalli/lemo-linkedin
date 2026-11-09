// «🎨 Grafiche nuove» per un post del calendario del Pannello: stile vecchio, Friendly e Scientifico,
// rigenerabili e con le versioni sfogliabili (stesso componente delle bozze AI).
// Il testo si modifica nel Pannello (Modifica / Rigenera testo): qui solo la grafica.
import { useEffect, useMemo, useState } from 'react';
import { supabase, supabaseUrl } from '../supabase.js';
import { immaginiPost } from '../lib/grafica.js';
import { avatar, fmtData, scaricaUrl } from '../lib/util.js';
import Grafiche from './Grafiche.jsx';

export default function GraficaCalendario({ post, members, posts, me, applica, chiudi }) {
  const member = members.find(m => m.id === post.member_id);
  const puo = post.member_id === me.id || me.is_admin;
  const [vecchie, setVecchie] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const idxSlot = useMemo(() => posts.filter(p => p.member_id === post.member_id && p.origine === 'piano').sort((a, b) => (a.slot < b.slot ? -1 : 1)).findIndex(p => p.id === post.id), [posts, post]);

  useEffect(() => {
    let vivo = true;
    immaginiPost(member, post, Math.max(0, idxSlot)).then(x => { if (vivo) setVecchie(x); }).catch(() => { if (vivo) setVecchie([]); });
    return () => { vivo = false; };
  }, [post.id]); // eslint-disable-line

  async function crea() {
    setBusy(true); setErr(null);
    const { data: s } = await supabase.auth.getSession();
    const r = await fetch(`${supabaseUrl}/functions/v1/genera-bozza`, {
      method: 'POST', headers: { Authorization: 'Bearer ' + s.session.access_token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ azione: 'grafica', post_id: post.id }),
    });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) { setErr(j.error || `Errore ${r.status}`); return; }
    applica('posts', j.post);
  }

  return (
    <div className="overlay" onMouseDown={e => { if (e.target === e.currentTarget) chiudi(); }}>
      <div className="drawer">
        <div className="dr-head">
          <img className="av" src={avatar(post.member_id)} alt="" />
          <div>
            <b>Grafiche · {member?.nome_breve || member?.nome}</b> <span className="muted">· post {post.slot} · {fmtData(post.scheduled_at)}</span>
            <div className="small muted">{(post.titolo || '').slice(0, 110)}</div>
          </div>
          <div className="sp" />
          <button className="btn ghost sm" onClick={chiudi}>✕</button>
        </div>
        <div style={{ padding: 16 }}>
          {post.vis?.grafica ? (
            <Grafiche post={post} vecchie={vecchie} me={me} applica={applica} puo={puo} />
          ) : (
            <div className="card" style={{ margin: 0 }}>
              <p>Per questo post ci sono solo le tavole del kit. Le grafiche nuove (Friendly e Scientifico) si creano dal testo attuale del post.</p>
              {puo
                ? <button className="btn orange" disabled={busy} onClick={crea}>{busy ? 'Creo… (5-15 s)' : '✨ Crea grafiche nuove'}</button>
                : <p className="small muted">Solo {member?.nome_breve} o un admin possono crearle.</p>}
              {err && <p className="errtxt small">{err}</p>}
              <div className="imgs" style={{ marginTop: 12 }}>
                {vecchie === null && <div className="muted small">Carico le tavole…</div>}
                {vecchie && vecchie.map(im => (
                  <div key={im.nome} className="img">
                    {im.pdf ? <div className="pdf">PDF carosello</div> : <img src={im.url} alt={im.nome} loading="lazy" />}
                    <button className="btn ghost xs" onClick={() => scaricaUrl(im.url, im.nome)}>↓ {im.nome}</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
