// Schede aggiuntive dentro il Pannello: Bozze AI, Cosa sta imparando, Collega LinkedIn, Impostazioni.
import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTeamData } from '../data.js';
import Impara from '../components/Impara.jsx';
import Collega from '../components/Collega.jsx';
import Impostazioni from '../components/Impostazioni.jsx';
import Editor from '../components/Editor.jsx';
import BozzeAI from './BozzeAI.jsx';

function Pane({ id, children }) {
  const el = document.getElementById('lemo-pane-' + id);
  return el ? createPortal(children, el) : null;
}

export default function Extra({ session }) {
  const data = useTeamData(session);
  const [aperto, setAperto] = useState(null);
  const email = session.user.email.toLowerCase();
  const me = useMemo(() => data.members.find(m => (m.email || '').toLowerCase() === email), [data.members, email]);

  document.documentElement.dataset.lemoLive = data.online ? '1' : '0';
  if (data.loading || !me) return null;
  if (data.error) return <Pane id="ai"><div className="card">Errore: {data.error}</div></Pane>;

  const ctx = { ...data, me, apri: setAperto };
  const postAperto = aperto && data.posts.find(p => p.id === aperto);
  return (
    <>
      <Pane id="ai"><section className="lemo-sezione"><BozzeAI {...ctx} /></section></Pane>
      <Pane id="impara"><section className="lemo-sezione"><Impara {...ctx} /></section></Pane>
      <Pane id="collega"><section className="lemo-sezione"><Collega {...ctx} /></section></Pane>
      {me.is_admin && <Pane id="impostazioni"><section className="lemo-sezione"><Impostazioni {...ctx} /></section></Pane>}
      {postAperto && <Editor key={postAperto.id} post={postAperto} {...ctx} chiudi={() => setAperto(null)} />}
    </>
  );
}
