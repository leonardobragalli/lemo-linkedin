#!/usr/bin/env python3
"""Regia LinkedIn LEMO - aggiornamento giornaliero della base di conoscenza.

Legge:
  - Lemons Insights (studi scientifici, sito pubblico insights.lemonsintheroom.com)
  - i database Notion attivi nella tabella `fonti_notion` (si gestiscono dal sito, Impostazioni)
e aggiorna la piattaforma: aggiunge le pagine nuove, aggiorna quelle cambiate, toglie quelle cancellate.

Solo libreria standard di Python 3 (nessuna installazione).
Configurazione nel file `.env` accanto allo script (vedi `.env.esempio`).

Uso:
  python3 aggiorna_conoscenza.py          aggiornamento normale
  python3 aggiorna_conoscenza.py --prova  legge tutto ma non scrive niente
"""
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime

CARTELLA = os.path.dirname(os.path.abspath(__file__))
FILE_LOG = os.path.join(CARTELLA, "aggiorna_conoscenza.log")
NOTION_VERSION = "2022-06-28"
INSIGHTS = "https://insights.lemonsintheroom.com"

# Usate solo con --prova se la piattaforma non risponde (stesse 6 fonti della tabella fonti_notion)
FONTI_DI_RISERVA = [
    {"db_id": "299e69fb-b9e6-807f-a025-c86ddaa82bf2", "nome": "Paper clinici", "corpo": True, "campi_esclusi": []},
    {"db_id": "2fae69fb-b9e6-800e-9abd-f5348624ecf1", "nome": "Press", "corpo": False, "campi_esclusi": []},
    {"db_id": "6f5b386b-4059-4902-b773-0d2d1d9288f8", "nome": "Blog", "corpo": True, "campi_esclusi": ["Meta Description (1)", "Featured Image"],
     "filtro_campo": "Status", "filtro_regex": "ready|publish|pubblicat|live", "escludi_campo": "Category", "escludi_regex": "nascost"},
    {"db_id": "1e2a1b2b-052e-4339-bcd6-26fa6b1d72de", "nome": "Procedure", "corpo": False, "campi_esclusi": ["Developer Notes", "Mapping Status"]},
    {"db_id": "ed33d2fa-b897-4aba-b180-50b5a5790b19", "nome": "Esperienze LEMO", "corpo": False,
     "campi_esclusi": ["Unity Scene", "Version", "Status", "Fallback Mode", "Transcript"]},
    {"db_id": "267e69fb-b9e6-8000-8b31-ffea0c38cd04", "nome": "Post social passati", "corpo": True, "campi_esclusi": [],
     "filtro_campo": "Status", "filtro_regex": "published", "escludi_campo": "Platform", "escludi_regex": "^((?!linkedin).)*$"},
]

# Righe dei modelli di pagina Notion, senza contenuto reale
TEMPLATE = {
    "Request Overview", "Basic information about who is requesting the social media post and their objective.",
    "Content Description", "Detailed description of what needs to be posted and any specific messaging requirements.",
    "Resource Needs", "Required assets, copy approval contacts, and other resources needed to fulfill this request.",
    "Request Status", "Current status of the request, next steps, and completion timeline.",
    "Background", "Context, objectives, and scope of the document", "Analysis", "Research findings, data insights, and key considerations",
    "Recommendations", "Proposed solutions, strategies, and next steps", "Implementation", "Action items, timeline, and resource requirements",
}


# ───────────────────────── utilità ─────────────────────────
def log(msg):
    riga = f"{datetime.now():%Y-%m-%d %H:%M:%S}  {msg}"
    print(riga, flush=True)
    try:
        with open(FILE_LOG, "a", encoding="utf-8") as f:
            f.write(riga + "\n")
    except OSError:
        pass


def carica_env():
    env = {}
    p = os.path.join(CARTELLA, ".env")
    if os.path.exists(p):
        with open(p, encoding="utf-8") as f:
            for r in f:
                r = r.strip()
                if r and not r.startswith("#") and "=" in r:
                    k, v = r.split("=", 1)
                    env[k.strip()] = v.strip().strip('"').strip("'")
    for k in ("SUPABASE_URL", "SUPABASE_ANON_KEY", "LEMO_SCRIPT_TOKEN", "NOTION_TOKEN"):
        if os.environ.get(k):
            env[k] = os.environ[k]
    return env


def http(url, metodo="GET", corpo=None, headers=None, tentativi=4, timeout=60):
    dati = json.dumps(corpo).encode() if corpo is not None else None
    h = {"User-Agent": "lemo-regia-script/1.0", **(headers or {})}
    if dati is not None:
        h["Content-Type"] = "application/json"
    for i in range(tentativi):
        try:
            req = urllib.request.Request(url, data=dati, headers=h, method=metodo)
            with urllib.request.urlopen(req, timeout=timeout) as r:
                testo = r.read().decode("utf-8")
                return json.loads(testo) if testo and "json" in (r.headers.get("Content-Type") or "") else testo
        except urllib.error.HTTPError as e:
            if e.code in (429, 500, 502, 503, 504) and i < tentativi - 1:
                time.sleep(2 * (i + 1))
                continue
            raise RuntimeError(f"HTTP {e.code} su {url.split('?')[0]}: {e.read().decode('utf-8', 'replace')[:200]}")
        except urllib.error.URLError as e:
            if i < tentativi - 1:
                time.sleep(3 * (i + 1))
                continue
            raise RuntimeError(f"Rete non raggiungibile ({url.split('/')[2]}): {e.reason}")


# ───────────────────────── piattaforma (Supabase) ─────────────────────────
class Piattaforma:
    def __init__(self, env):
        self.url = env.get("SUPABASE_URL", "").rstrip("/")
        self.chiave = env.get("SUPABASE_ANON_KEY", "")
        self.token = env.get("LEMO_SCRIPT_TOKEN", "")

    def rpc(self, nome, **arg):
        return http(f"{self.url}/rest/v1/rpc/{nome}", "POST", {"p_token": self.token, **arg},
                    {"apikey": self.chiave, "Accept": "application/json"})

    def carica(self, pezzi):
        scritti = 0
        for i in range(0, len(pezzi), 200):
            scritti += int(self.rpc("script_carica", p_chunks=pezzi[i:i + 200]) or 0)
        return scritti


# ───────────────────────── Notion ─────────────────────────
def notion(token, percorso, corpo=None):
    return http("https://api.notion.com/v1/" + percorso, "POST" if corpo is not None else "GET", corpo,
                {"Authorization": "Bearer " + token, "Notion-Version": NOTION_VERSION})


def valore(p):
    t = (p or {}).get("type")
    v = (p or {}).get(t)
    if v is None:
        return ""
    if t in ("title", "rich_text"):
        return "".join(x.get("plain_text", "") for x in v)
    if t in ("select", "status"):
        return v.get("name", "") if v else ""
    if t == "multi_select":
        return ", ".join(x.get("name", "") for x in v)
    if t == "number":
        return str(v)
    if t == "date":
        return v.get("start", "") if v else ""
    if t in ("url", "email", "phone_number"):
        return v or ""
    if t == "checkbox":
        return "sì" if v else "no"
    if t == "formula":
        if v.get("string") is not None:
            return v["string"]
        return str(v["number"]) if v.get("number") is not None else ""
    return ""  # people, relation, files, rollup: esclusi (dati personali/relazioni interne)


def passa_filtri(f, props):
    if f.get("filtro_campo") and f.get("filtro_regex") and not re.search(f["filtro_regex"], props.get(f["filtro_campo"], ""), re.I):
        return False
    if f.get("escludi_campo") and f.get("escludi_regex") and re.search(f["escludi_regex"], props.get(f["escludi_campo"], ""), re.I):
        return False
    return True


def testo_pagina(token, pid, massimo=120):
    righe, cur = [], None
    while True:
        r = notion(token, f"blocks/{pid}/children?page_size=100" + (f"&start_cursor={cur}" if cur else ""))
        for b in r.get("results", []):
            rt = (b.get(b.get("type")) or {}).get("rich_text")
            if isinstance(rt, list):
                s = "".join(x.get("plain_text", "") for x in rt).strip()
                if s and s not in TEMPLATE:
                    righe.append(s)
            if len(righe) >= massimo:
                return "\n".join(righe)
        if not r.get("has_more"):
            return "\n".join(righe)
        cur = r.get("next_cursor")


def leggi_notion(token, fonti, visti):
    pezzi, presenti, errori = [], [], []
    for f in fonti:
        cur, n_fonte, n_nuove = None, 0, 0
        try:
            while True:
                corpo = {"page_size": 100}
                if cur:
                    corpo["start_cursor"] = cur
                r = notion(token, f"databases/{f['db_id']}/query", corpo)
                for p in r.get("results", []):
                    props, titolo = {}, ""
                    for k, v in p.get("properties", {}).items():
                        if v.get("type") == "title":
                            titolo = valore(v)
                        elif k not in (f.get("campi_esclusi") or []):
                            s = valore(v)
                            if s:
                                props[k] = s
                    if not passa_filtri(f, props):
                        continue
                    presenti.append(p["id"])
                    n_fonte += 1
                    if visti.get(p["id"]) == p.get("last_edited_time"):
                        continue
                    testo_corpo = ""
                    if f.get("corpo"):
                        try:
                            testo_corpo = testo_pagina(token, p["id"])
                        except Exception as e:  # una pagina illeggibile non blocca le altre
                            errori.append(f"{f['nome']} / {titolo[:40]}: {e}")
                    testo = "\n\n".join(x for x in ["\n".join(f"{k}: {v}" for k, v in props.items()), testo_corpo] if x)[:8000]
                    pezzi.append({"fonte": "notion", "source_id": p["id"], "url": p.get("url"), "titolo": titolo or "(senza titolo)",
                                  "testo": testo, "area": f["nome"], "meta": {"database": f["nome"], "last_edited": p.get("last_edited_time")}})
                    n_nuove += 1
                if not r.get("has_more"):
                    break
                cur = r.get("next_cursor")
            log(f"  Notion · {f['nome']}: {n_fonte} pagine, {n_nuove} nuove o cambiate")
        except Exception as e:
            errori.append(f"{f['nome']}: {e}")
            log(f"  Notion · {f['nome']}: ERRORE {e}")
    return pezzi, presenti, errori


# ───────────────────────── Lemons Insights ─────────────────────────
def _str_js(seg, chiave):
    m = re.search(chiave + r':"((?:[^"\\]|\\.)*)"', seg)
    return m.group(1).replace("\\n", "\n").replace('\\"', '"') if m else ""


def leggi_insights():
    pezzi, errori = [], []
    html = http(INSIGHTS)
    m = re.search(r'src="(/assets/index-[^"]+\.js)"', html)
    if not m:
        raise RuntimeError("Insights: bundle principale non trovato (il sito è cambiato?)")
    js = http(INSIGHTS + m.group(1))
    nomi = list(dict.fromkeys(re.findall(r"assets/([A-Za-z0-9_.-]+\.js)", js)))
    client = next((n for n in nomi if n.startswith("client-")), None)
    hard = next((n for n in nomi if n.startswith("hardcodedStudies-")), None)

    if client:
        cjs = http(f"{INSIGHTS}/assets/{client}")
        url = re.search(r"https://[a-z0-9]+\.supabase\.co", cjs)
        key = re.search(r"eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+", cjs)
        if url and key:
            for da in range(0, 5000, 500):
                righe = http(f"{url.group(0)}/rest/v1/studies?select=id,title,authors,keywords,url,study_design&order=created_at&offset={da}&limit=500",
                             headers={"apikey": key.group(0), "Authorization": "Bearer " + key.group(0)})
                for s in righe:
                    pezzi.append({"fonte": "insights_studio", "source_id": str(s["id"]), "url": s.get("url"), "titolo": s.get("title") or "",
                                  "testo": "\n".join(x for x in [s.get("authors") and f"Autori: {s['authors']}",
                                                                 s.get("study_design") and f"Disegno: {s['study_design']}"] if x),
                                  "area": ", ".join(s.get("keywords") or []), "meta": {"study_design": s.get("study_design")}})
                if len(righe) < 500:
                    break
        else:
            errori.append("Insights: chiave pubblica non trovata")
    else:
        errori.append("Insights: modulo client non trovato")

    if hard:
        hjs = http(f"{INSIGHTS}/assets/{hard}")
        for seg0 in re.split(r'source:"hardcoded"', hjs):
            i = seg0.rfind("{title:")
            if i < 0:
                continue
            seg = seg0[i:]
            titolo, url = _str_js(seg, "title"), _str_js(seg, "url")
            if not titolo:
                continue
            kw = re.search(r"keywords:\[([^\]]*)\]", seg)
            autori, disegno, abstract = _str_js(seg, "authors"), _str_js(seg, "studyDesign"), _str_js(seg, "abstract")
            pezzi.append({"fonte": "insights_studio", "source_id": "hc:" + (url or titolo)[:180], "url": url or None, "titolo": titolo,
                          "testo": "\n".join(x for x in [autori and f"Autori: {autori}", disegno and f"Disegno: {disegno}", abstract] if x),
                          "area": kw.group(1).replace('"', "") if kw else "", "meta": {"study_design": disegno, "con_abstract": bool(abstract)}})
    # niente doppioni (stesso id da due elenchi)
    unici = {}
    for p in pezzi:
        unici[p["source_id"]] = p
    return list(unici.values()), errori


# ───────────────────────── main ─────────────────────────
def main():
    prova = "--prova" in sys.argv
    env = carica_env()
    log("=" * 60)
    log("Aggiornamento base di conoscenza" + (" (PROVA: non scrivo niente)" if prova else ""))
    mancanti = [k for k in ("SUPABASE_URL", "SUPABASE_ANON_KEY", "LEMO_SCRIPT_TOKEN", "NOTION_TOKEN") if not env.get(k)]
    if mancanti and not (prova and env.get("NOTION_TOKEN")):
        log("Mancano nel file .env: " + ", ".join(mancanti))
        return 2

    pf = Piattaforma(env)
    errori, rep = [], {}

    # fonti attive e pagine già lette
    try:
        stato = pf.rpc("script_stato")
        fonti, visti = stato.get("fonti") or [], stato.get("visti") or {}
    except Exception as e:
        if not prova:
            log(f"Piattaforma non raggiungibile: {e}")
            return 1
        log(f"(prova) piattaforma non raggiungibile, uso le 6 fonti predefinite: {e}")
        fonti, visti = FONTI_DI_RISERVA, {}
    log(f"Fonti Notion attive: {', '.join(f['nome'] for f in fonti) or 'nessuna'}")

    # 1. Lemons Insights
    try:
        ins, err = leggi_insights()
        errori += err
        log(f"  Insights: {len(ins)} studi letti")
        if not prova:
            rep["insights"] = pf.carica(ins)
            if len(ins) > 50:  # tolgo gli studi spariti solo se la lettura è plausibile
                rep["insights_rimossi"] = pf.rpc("script_pulisci", p_fonte="insights_studio", p_presenti=[p["source_id"] for p in ins])
        else:
            rep["insights"] = len(ins)
    except Exception as e:
        errori.append(f"Insights: {e}")
        log(f"  Insights: ERRORE {e}")

    # 2. Notion
    pezzi, presenti, err = leggi_notion(env["NOTION_TOKEN"], fonti, visti)
    errori += err
    rep["notion_nuove_o_cambiate"] = len(pezzi)
    rep["notion_totali"] = len(presenti)
    if not prova:
        if pezzi:
            pf.carica(pezzi)
        if not err:  # tolgo le pagine sparite (o di fonti disattivate) solo se tutte le letture sono andate bene
            rep["notion_rimossi"] = pf.rpc("script_pulisci", p_fonte="notion", p_presenti=presenti or ["__nessuna_fonte_attiva__"])

    ok = not errori
    rep["errori"] = errori[:20]
    log(f"Risultato: {json.dumps(rep, ensure_ascii=False)}")
    if not prova:
        try:
            pf.rpc("script_log", p_ok=ok, p_dettagli=rep)
        except Exception as e:
            log(f"Registro sulla piattaforma non scritto: {e}")
    log("Fatto ✓" if ok else "Fatto, con errori (vedi sopra)")
    return 0 if ok else 1


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as e:
        log(f"ERRORE imprevisto: {e}")
        sys.exit(1)
