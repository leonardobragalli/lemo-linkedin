// Schede aggiuntive dentro il Pannello (Nuovo post, Cosa sta imparando, Collega LinkedIn, Impostazioni)
// + azioni della vista semplice sui post del calendario (window.__lemoApp, usate da semplice.js).
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTeamData } from '../data.js';
import { supabase, supabaseUrl } from '../supabase.js';
import { fmtData, normalizzaTestoPuro, fromBold } from '../lib/util.js';
import Impara from '../components/Impara.jsx';
import Collega from '../components/Collega.jsx';
import Impostazioni from '../components/Impostazioni.jsx';
import Editor from '../components/Editor.jsx';
import GraficaCalendario from '../components/GraficaCalendario.jsx';
import BozzeAI from './BozzeAI.jsx';
import { aggiornaSplash, rinfrescaPulsantiPost } from './semplice.js';

const P = () => window.__lemoPannello;

function Pane({ id, children }) {
  const el = document.getElementById('lemo-pane-' + id);
  return el ? createPortal(children, el) : null;
}

// stesse istruzioni della riscrittura del calendario (scripts/riscrivi_calendario.py)
const ISTR = `RISCRITTURA DI UN POST GIÀ IN CALENDARIO. Riscrivi il post qui sotto seguendo tutte le regole.
Mantieni: lo stesso tema e lo stesso punto di vista; eventi, date, luoghi, nomi e persone citate; gli studi già citati (il primo commento con le fonti resta quello attuale: non citare studi diversi da questi).
Togli: frasi-istruzione rimaste nel testo, chiusure e slogan ripetuti, grassetto, numeri che non trovi nelle fonti.
Fai una versione DIVERSA da quella attuale: altra apertura, altro taglio.
Lingua: la stessa del post originale.
POST ATTUALE:
`;
function lingua(t) {
  const s = ' ' + t.toLowerCase() + ' ';
  const c = ws => ws.reduce((n, w) => n + s.split(w).length - 1, 0);
  return c([' the ', ' and ', ' of ', ' to ', ' is ', ' with ']) > c([' il ', ' che ', ' della ', ' per ', ' non ', ' è ']) ? 'en' : 'it';
}
// ruoli cambiati dopo il kit: la pagina iniziale del Pannello li mostra ancora vecchi
const RUOLI_AGGIORNATI = ['leonardo', 'sofia', 'alessandro_romagnosi'];

export default function Extra({ session }) {
  const data = useTeamData(session);
  const [aperto, setAperto] = useState(null);
  const [grafica, setGrafica] = useState(null);
  const email = session.user.email.toLowerCase();
  const me = useMemo(() => data.members.find(m => (m.email || '').toLowerCase() === email), [data.members, email]);
  const rif = useRef({});
  rif.current = { data, me };

  // azioni per i post del calendario del Pannello
  useEffect(() => {
    const riga = (prof, pid) => rif.current.data.posts.find(p => p.origine === 'piano' && p.member_id === prof && p.slot === pid);
    const testoAttuale = (prof, pid, r) => P()?.stato(prof, 'testo-post', pid) || r?.testo || '';
    window.__lemoApp = {
      puo: prof => { const m = rif.current.me; return !!m && (m.id === prof || !!m.is_admin); },
      ruolo: id => {
        if (!RUOLI_AGGIORNATI.includes(id)) return null;
        const r = rif.current.data.members.find(m => m.id === id)?.ruolo;
        return r ? r.replace(/\s*@\s*Lemons in the room\s*$/i, '') : null;
      },
      prossimo: id => {
        const ora = new Date().toISOString();
        const p = rif.current.data.posts.filter(x => x.member_id === id && x.origine === 'piano' && x.scheduled_at && x.scheduled_at >= ora && !['pubblicato', 'scartato'].includes(x.stato))
          .sort((a, b) => (a.scheduled_at < b.scheduled_at ? -1 : 1))[0];
        return p ? fmtData(p.scheduled_at) : null;
      },
      quantePrecedenti: (prof, pid) => (riga(prof, pid)?.generazione?.precedenti || []).length,
      rigeneraTesto: async (prof, pid) => {
        const r = riga(prof, pid);
        if (!r) return { errore: 'Post non trovato nel database' };
        const attuale = testoAttuale(prof, pid, r);
        const pulito = fromBold(normalizzaTestoPuro(attuale)).normalize('NFC');
        const { data: s } = await supabase.auth.getSession();
        const res = await fetch(`${supabaseUrl}/functions/v1/genera-bozza`, {
          method: 'POST', headers: { Authorization: 'Bearer ' + s.session.access_token, 'Content-Type': 'application/json' },
          body: JSON.stringify({ member_id: prof, tema: r.tema || '', istruzioni: ISTR + pulito, solo_testo: true, lingua: lingua(pulito), post_id: r.id }),
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok || !j.testo) return { errore: j.error || `Errore ${res.status}` };
        const ora = new Date().toISOString();
        const precedenti = [...(r.generazione?.precedenti || []), { testo: attuale, quando: ora, da: rif.current.me?.id }].slice(-5);
        const { data: nuova, error } = await supabase.from('posts').update({ generazione: { ...(r.generazione || {}), precedenti, ultima_riscrittura: { quando: ora, controlli: j.controlli || [], note: j.note || null } } }).eq('id', r.id).select().single();
        if (error) return { errore: 'Versione precedente non salvata, testo non cambiato: ' + error.message };
        rif.current.data.applica('posts', nuova);
        P().mettiInSlot(prof, pid, j.testo);
        return { ok: true };
      },
      // scambia il testo attuale con l'ultima versione precedente (premendo di nuovo si torna avanti)
      versionePrecedente: async (prof, pid) => {
        const r = riga(prof, pid);
        const prec = r?.generazione?.precedenti || [];
        if (!prec.length) return { errore: 'Nessuna versione precedente' };
        const ultima = prec[prec.length - 1];
        const attuale = testoAttuale(prof, pid, r);
        const precedenti = [...prec.slice(0, -1), { testo: attuale, quando: new Date().toISOString(), da: rif.current.me?.id }];
        const { data: nuova, error } = await supabase.from('posts').update({ generazione: { ...(r.generazione || {}), precedenti } }).eq('id', r.id).select().single();
        if (error) return { errore: error.message };
        rif.current.data.applica('posts', nuova);
        P().mettiInSlot(prof, pid, ultima.testo);
        return { ok: true };
      },
      apriGrafica: (prof, pid) => { const r = riga(prof, pid); if (r) setGrafica(r.id); },
    };
    return () => { delete window.__lemoApp; };
  }, []);

  // pagina iniziale e pulsanti dei post seguono i dati
  useEffect(() => {
    if (data.loading) return;
    aggiornaSplash();
    rinfrescaPulsantiPost();
  }, [data.loading, data.posts, data.members]);

  document.documentElement.dataset.lemoLive = data.online ? '1' : '0';
  if (data.loading || !me) return null;
  if (data.error) return <Pane id="ai"><div className="card">Errore: {data.error}</div></Pane>;

  const ctx = { ...data, me, apri: setAperto };
  const postAperto = aperto && data.posts.find(p => p.id === aperto);
  const postGrafica = grafica && data.posts.find(p => p.id === grafica);
  return (
    <>
      <Pane id="ai"><section className="lemo-sezione"><BozzeAI {...ctx} /></section></Pane>
      <Pane id="impara"><section className="lemo-sezione"><Impara {...ctx} /></section></Pane>
      <Pane id="collega"><section className="lemo-sezione"><Collega {...ctx} /></section></Pane>
      <Pane id="impostazioni"><section className="lemo-sezione"><Impostazioni {...ctx} /></section></Pane>
      {postAperto && <Editor key={postAperto.id} post={postAperto} {...ctx} chiudi={() => setAperto(null)} />}
      {postGrafica && <GraficaCalendario key={postGrafica.id} post={postGrafica} {...ctx} chiudi={() => setGrafica(null)} />}
    </>
  );
}
