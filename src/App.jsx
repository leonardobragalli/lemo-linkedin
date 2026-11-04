import { useEffect, useMemo, useState } from 'react';
import { supabase } from './supabase.js';
import { useTeamData } from './data.js';
import Login from './components/Login.jsx';
import Calendario from './components/Calendario.jsx';
import Coda from './components/Coda.jsx';
import Editor from './components/Editor.jsx';
import Analisi from './components/Analisi.jsx';
import Team from './components/Team.jsx';
import Impara from './components/Impara.jsx';
import Collega from './components/Collega.jsx';
import Impostazioni from './components/Impostazioni.jsx';
import { avatar } from './lib/util.js';

const VISTE = [
  { id: 'calendario', label: 'Calendario team' },
  { id: 'coda', label: 'I miei post' },
  { id: 'analisi', label: 'Analisi' },
  { id: 'impara', label: 'Cosa sta imparando' },
  { id: 'team', label: 'Team & follower' },
  { id: 'collega', label: 'Collega LinkedIn' },
  { id: 'impostazioni', label: 'Impostazioni', admin: true },
];

export default function App() {
  const [session, setSession] = useState(undefined);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (session === undefined) return <div className="center muted">Caricamento…</div>;
  if (!session) return <Login />;
  return <Shell session={session} />;
}

function Shell({ session }) {
  const data = useTeamData(session);
  const [vista, setVista] = useState(() => { const h = location.hash.replace('#', ''); return VISTE.some(v => v.id === h) ? h : 'calendario'; });
  const [aperto, setAperto] = useState(null); // id post
  const email = session.user.email.toLowerCase();
  const me = useMemo(() => data.members.find(m => (m.email || '').toLowerCase() === email), [data.members, email]);

  useEffect(() => { location.hash = vista; }, [vista]);

  if (data.loading) return <div className="center muted">Carico i dati del team…</div>;
  if (data.error) return <div className="center">Errore: {data.error}</div>;
  if (!me) return (
    <div className="center col">
      <p>L'email {email} non è nel team.</p>
      <button className="btn" onClick={() => supabase.auth.signOut()}>Esci</button>
    </div>
  );

  const ctx = { ...data, me, apri: setAperto };
  const postAperto = aperto && data.posts.find(p => p.id === aperto);

  return (
    <div className="app">
      <header className="top">
        <div className="brand">🍋 <b>Regia LinkedIn</b> <span className="muted">Lemons in the room</span></div>
        <nav>
          {VISTE.filter(v => !v.admin || me.is_admin).map(v => (
            <button key={v.id} className={'tab' + (vista === v.id ? ' on' : '')} onClick={() => setVista(v.id)}>{v.label}</button>
          ))}
        </nav>
        <div className="who">
          <span className={'dot ' + (data.online ? 'ok' : 'ko')} title={data.online ? 'Aggiornamento in tempo reale attivo' : 'Tempo reale non connesso'} />
          <img className="av" src={avatar(me.id)} alt="" />
          <span>{me.nome_breve || me.nome}</span>
          <button className="btn ghost sm" onClick={() => supabase.auth.signOut()}>Esci</button>
        </div>
      </header>
      <main>
        {vista === 'calendario' && <Calendario {...ctx} />}
        {vista === 'coda' && <Coda {...ctx} />}
        {vista === 'analisi' && <Analisi {...ctx} />}
        {vista === 'team' && <Team {...ctx} />}
        {vista === 'impara' && <Impara {...ctx} />}
        {vista === 'collega' && <Collega {...ctx} />}
        {vista === 'impostazioni' && <Impostazioni {...ctx} />}
      </main>
      {postAperto && <Editor key={postAperto.id} post={postAperto} {...ctx} chiudi={() => setAperto(null)} />}
    </div>
  );
}
