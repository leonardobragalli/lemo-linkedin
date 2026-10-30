// Generatore grafico 4K portato da Pannello.html v7.3 (kit di Matteo Era).
// Codice originale invariato salvo questa intestazione e gli export in fondo.
/* eslint-disable */
const ASSET_URIS = {};
const BLOB_URLS = {};
function dataUriToBlob(dataUri, forceOctetStream){
  const virgola = dataUri.indexOf(',');
  const testa = dataUri.slice(0, virgola);
  const dati = dataUri.slice(virgola + 1);
  const tipo = forceOctetStream ? 'application/octet-stream' : testa.slice(5, testa.indexOf(';'));
  const bin = atob(dati);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return new Blob([buf], {type: tipo});
}
/* ── MOTORE ULTRA-VELOCE E 100% AUTONOMO (<template> INERTI + BLOB OCTET-STREAM SINCRONI PER SAFARI/CHROME) ── */

const STILI_COLLEGA = {
  alessandro_napoli: { bg1: '#1C0D06', bg2: '#4A1D09', acc: '#FF8731', sec: '#FBBF24', paper: '#FFF8F2', ink: '#221208', muted: '#6E503B' },
  niccolo_berni:     { bg1: '#081B2E', bg2: '#163D64', acc: '#FF7A33', sec: '#38BDF8', paper: '#F3F7FB', ink: '#0B2135', muted: '#4A637D' },
  niccolo_cesareo:   { bg1: '#09261B', bg2: '#15523A', acc: '#F59E0B', sec: '#34D399', paper: '#F4F8F5', ink: '#0C2B1E', muted: '#466959' },
  lazar:             { bg1: '#0D0F2B', bg2: '#202664', acc: '#38BDF8', sec: '#FF8731', paper: '#F3F5FC', ink: '#111536', muted: '#4F5682' },
  emma:              { bg1: '#331024', bg2: '#691E45', acc: '#FDA4AF', sec: '#FFB085', paper: '#FDF5F7', ink: '#2E0E20', muted: '#75465E' },
  riccardo:          { bg1: '#281308', bg2: '#662D11', acc: '#FB923C', sec: '#FDE047', paper: '#FFF7F0', ink: '#291409', muted: '#73503C' },
  sofia:             { bg1: '#3D101D', bg2: '#801D37', acc: '#FB7185', sec: '#FBBF24', paper: '#FFF6F6', ink: '#2B0C15', muted: '#784552' },
  alessandro_romagnosi: { bg1: '#062529', bg2: '#0E4E56', acc: '#2DD4BF', sec: '#FB923C', paper: '#F2FAFA', ink: '#08282C', muted: '#436B70' },
  leonardo:          { bg1: '#101926', bg2: '#223650', acc: '#34D399', sec: '#60A5FA', paper: '#F3F6FA', ink: '#121D2B', muted: '#4B5E75' }
};

function svgToDataUri(svgStr){
  return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgStr)));
}

function xmlEsc(s){
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function wrapLines(text, maxChars, maxLines){
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let cur = '';
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    const next = cur ? cur + ' ' + w : w;
    if (next.length <= maxChars || !cur) {
      cur = next;
    } else {
      lines.push(cur);
      cur = w;
      if (lines.length >= maxLines - 1) {
        const rest = [cur, ...words.slice(i + 1)].join(' ');
        lines.push(rest.length > maxChars + 4 ? rest.slice(0, maxChars + 1).replace(/\s+\S*$/, '') + '…' : rest);
        return lines;
      }
    }
  }
  if (cur && lines.length < maxLines) lines.push(cur);
  return lines;
}

function svgTextBlock(text, x, y, maxChars, lineHeight, maxLines, attrs){
  const lines = wrapLines(text, maxChars, maxLines);
  const tspans = lines.map((ln, idx) =>
    `<tspan x="${x}" dy="${idx === 0 ? 0 : lineHeight}">${xmlEsc(ln)}</tspan>`
  ).join('');
  return `<text x="${x}" y="${y}" ${attrs}>${tspans}</text>`;
}

function svgHeadlineWithUnderline(text, x, y, maxChars, lineHeight, maxLines, attrs, barColor){
  const lines = wrapLines(text, maxChars, maxLines);
  const tspans = lines.map((ln, idx) =>
    `<tspan x="${x}" dy="${idx === 0 ? 0 : lineHeight}">${xmlEsc(ln)}</tspan>`
  ).join('');
  const lastIdx = Math.max(0, lines.length - 1);
  const lastLen = (lines[lastIdx] || '').length;
  const barW = Math.min(820, Math.max(180, Math.round(lastLen * 22)));
  const barY = y + lastIdx * lineHeight + 12;
  return `<text x="${x}" y="${y}" ${attrs}>${tspans}</text>
          <rect x="${x}" y="${barY}" width="${barW}" height="6" rx="3" fill="${barColor}"/>`;
}

// Ricava 3 celle KPI strutturate e specifiche per ogni slot e per ogni ruolo del team
function estraiTreKpiCollega(prof, pData, v){
  const isEn = (prof.id === 'lazar');
  const pid = pData.id;
  const mVal = v.metrica_val || 'LEMO CE';
  const mLbl = (v.metrica_lbl || 'Evidenza verificata').slice(0, 32);
  const SLOT_SECONDARY_KPIS = {
    '01': [isEn ? 'PATIENT ROLE' : 'RUOLO PAZIENTE', isEn ? '0 Tasks' : '0 Compiti', isEn ? 'No controller or menus' : 'Nessun controller o menu', isEn ? 'SANITIZATION' : 'SANIFICAZIONE', '45 sec', isEn ? 'Medical-grade surfaces' : 'Protocollo tra due letti'],
    '02': [isEn ? 'ACUTE ANXIETY' : 'ANSIA PROCEDURALE', 'SMD 1,32', isEn ? 'Venipuncture & oncology' : 'Prelievi, ustioni e oncologia', isEn ? 'OBSERVERS' : 'OSSERVATORI', 'SMD 2,08', isEn ? 'Parents & ward nurses' : 'Genitori e personale'],
    '03': [isEn ? 'UNPLEASANTNESS' : 'COMP. AFFETTIVA', '-31%', isEn ? 'Perceived distress drop' : 'Sgradevolezza percepita', isEn ? 'WORST PAIN' : 'PICCO DOLORE', '-27%', isEn ? 'Crossover burn RCT' : 'Intensità dolore acuto'],
    '04': [isEn ? 'PSYCHOMETRICS' : 'PSICOMETRIA', 'STAI · GAD', isEn ? 'Cronbach alpha 0.85-0.92' : 'Coerenza interna α > 0,85', isEn ? 'PHYSIOLOGY' : 'FISIOLOGIA SALA', 'FC · PA', isEn ? 'Autonomic convergence' : 'Monitor e farmaci in < 2m'],
    '05': [isEn ? 'PACU RECOVERY' : 'SALA RISVEGLIO', '-22 min', isEn ? '53 vs 75 min discharge' : 'Dimissione 53 vs 75 min', isEn ? 'ANALGESIA' : 'ANALGESIA SALA', '100%', isEn ? 'Regional block preserved' : 'Controllo loco-regionale'],
    '06': [isEn ? 'INFECTION CTRL' : 'IGIENE OSPEDALIERA', '45 sec', isEn ? 'Validated wipe protocol' : 'Tracciabilità tra pazienti', isEn ? 'PRIMARY ENDPOINT' : 'ENDPOINT T0-T1', 'VAS · STAI', isEn ? 'Measured at bedside' : 'Rilevazione al letto'],
    '07': [isEn ? 'REPEATED CYCLES' : 'SEDUTE RIPETUTE', 'Zero Loop', isEn ? 'Dynamic generative scenes' : 'Scenari dinamici anti-abitudine', isEn ? 'AUTONOMIC TONE' : 'TONO AUTONOMICO', '6 atti/m', isEn ? 'Physiological Sigh pacing' : 'Guida respiratoria integrata'],
    '08': [isEn ? 'SAVED MRI SCANS' : 'ESAMI SALVATI', '1,2% RM', isEn ? 'Prevented claustrophobia stops' : 'Interruzioni evitate per ansia', isEn ? 'PARTNER HTA' : 'PARTNER HTA', 'Sant’Anna', isEn ? 'Economic & clinical model' : 'Valutazione di impatto'],
    '09': [isEn ? 'YOUNG ADULTS' : 'GIOVANI ADULTI', '20–30%', isEn ? 'Clinical needle phobia' : 'Prevalenza agofobia', isEn ? 'PEDIATRIC FEAR' : 'ETÀ PEDIATRICA', '> 50%', isEn ? '119 studies meta-analysis' : 'Meta-analisi su 119 studi'],
    '10': [isEn ? 'COMPLETION' : 'COMPLETEZZA DATI', '> 90%', isEn ? 'Pre-post T0-T1 capture' : 'Rilevazione pre-post T0-T1', isEn ? 'NURSE WORKLOAD' : 'CARICO TURNO', '< 2 min', isEn ? 'CONSORT feasibility criteria' : 'Sostenibilità in corsia'],
    '11': [isEn ? 'ACTIVE DISTRACT.' : 'DISTRAZIONE', '30 RCT', isEn ? 'Cochrane systematic review' : 'Studi a favore in revisione', isEn ? 'VR EFFECT SIZE' : 'EFFETTO VR', 'SMD 1,30', isEn ? 'Pain & anxiety reduction' : 'Riduzione dolore e ansia'],
    '12': [isEn ? 'CLINICAL AREAS' : 'AREE CLINICHE', '8 Reparti', isEn ? 'Oncology to Cardiology' : 'Oncologia, Pediatria, Cardio', isEn ? 'EVIDENCE BASE' : 'LIBRERIA STUDI', '261+ Studi', isEn ? 'Peer-reviewed literature' : 'Fonti scientifiche PubMed'],
    '13': [isEn ? 'ANXIETY METRIC' : 'ENDPOINT ANSIA', 'STAI-6', isEn ? 'Pre-post peri-procedural' : 'Controllo peri-procedurale', isEn ? 'SEDATION SPARING' : 'SEDAZIONE', 'Titrazione', isEn ? 'Non-drug patient support' : 'Supporto durante accesso'],
    '14': [isEn ? 'CLINICAL TRIALS' : 'EVIDENZA RCT', 'VAS & STAI', isEn ? 'Reduced pelvic hypertonia' : 'Meno ipertono e dolore', isEn ? 'PATIENT COMFORT' : 'TOLLERABILITÀ', '100% Vigile', isEn ? 'Outpatient hysteroscopy' : 'Ambulatorio chirurgico'],
    '15': [isEn ? 'LINEAR MOTION' : 'CINEMATICA', '< 0,3 m/s', isEn ? 'Zero acceleration spikes' : 'Moto lento senza scatti', isEn ? 'FRAME RATE' : 'FREQUENZA', '60 fps', isEn ? 'Zero vestibular conflict' : 'Zero conflitto vestibolare'],
    '16': [isEn ? 'NEUROBIOLOGY' : 'MECCANISMO', 'Ippocampo', isEn ? 'Ploghaus et al., Science' : 'Stop iperalgesia da attesa', isEn ? 'PAIN THRESHOLD' : 'SOGLIA DOLORE', 'Protetta', isEn ? 'Pre-procedural modulation' : 'Intervento prima dell’ago'],
    '17': [isEn ? 'META-ANALYSIS' : 'META-ANALISI', '26 RCT', isEn ? '1,620 burn & wound patients' : '1.620 pazienti ustioni/ferite', isEn ? 'DRESSING PAIN' : 'CAMBIO MEDICAZIONE', '-1,13 VAS', isEn ? 'Bedside non-drug analgesia' : 'Riduzione dolore procedurale'],
    '18': [isEn ? 'DRESSING ANXIETY' : 'ANSIA MEDICAZIONE', 'SMD -0,83', isEn ? 'Hands-free bedside scenes' : 'Scenari bedside senza cavi', isEn ? 'BEDSIDE TIMING' : 'AVVIO BEDSIDE', 'T - 5 min', isEn ? '10s tablet start · 45s wipe' : '10s da tablet · igiene 45s']
  };
  // [lemo-linkedin] post nuovi senza slot: niente numeri presi da altri post
  const sec = SLOT_SECONDARY_KPIS[pid] || [isEn ? 'DEVICE' : 'DISPOSITIVO', 'LEMO', isEn ? 'CE-marked medical device' : 'Dispositivo medico CE', 'TEAM', 'Lemons', 'in the Room'];
  return [
    { tag: isEn ? 'PRIMARY METRIC' : 'DATO PRIMARIO', val: mVal, desc: mLbl },
    { tag: sec[0], val: sec[1], desc: sec[2] },
    { tag: sec[3], val: sec[4], desc: sec[5] }
  ];
}

// Barra tabulare a 3 colonne stile Swiss Monograph (1px hairline dividers, zero nested boxes)
function costruisciBarraKpiSvg(kpis, citazione, x, y, w, isLight, accCol, secCol){
  const h = 152;
  const bg = isLight ? 'rgba(255,255,255,0.92)' : 'rgba(9,19,30,0.82)';
  const bdr = isLight ? 'rgba(34,18,8,0.16)' : 'rgba(255,245,238,0.22)';
  const divC = isLight ? 'rgba(34,18,8,0.12)' : 'rgba(255,245,238,0.15)';
  const txtM = isLight ? '#221208' : '#FFF5EE';
  const txtS = isLight ? '#6E503B' : 'rgba(255,245,238,0.80)';
  const colW = Math.round(w / 3);
  const cellsSvg = kpis.map((k, i) => {
    const cx = x + i * colW;
    const sep = i < 2 ? `<line x1="${cx + colW}" y1="${y + 14}" x2="${cx + colW}" y2="${y + 106}" stroke="${divC}" stroke-width="1"/>` : '';
    return `
      <text x="${cx + 22}" y="${y + 32}" fill="${i === 0 ? accCol : txtS}" font-family="Runde,sans-serif" font-weight="600" font-size="14.5" letter-spacing="1.4">${xmlEsc(k.tag)}</text>
      <text x="${cx + 22}" y="${y + 72}" fill="${i === 0 ? (isLight ? accCol : secCol) : txtM}" font-family="Recoleta,Georgia,serif" font-weight="600" font-size="35">${xmlEsc(k.val)}</text>
      <text x="${cx + 22}" y="${y + 98}" fill="${txtS}" font-family="Runde,sans-serif" font-weight="500" font-size="17">${xmlEsc(k.desc.slice(0, 28))}</text>
      ${sep}
    `;
  }).join('');
  return `
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="20" fill="${bg}" stroke="${bdr}" stroke-width="1.5"/>
    ${cellsSvg}
    <line x1="${x}" y1="${y + 114}" x2="${x + w}" y2="${y + 114}" stroke="${divC}" stroke-width="1"/>
    <text x="${x + 22}" y="${y + 139}" fill="${txtS}" font-family="Runde,sans-serif" font-weight="500" font-size="16.5">Fonte: ${xmlEsc((citazione || '').slice(0, 82))}</text>
  `;
}

// 6 Moduli Quantitativi e Grafici di Visualizzazione Dati per la Scheda Dati (Immagine 2) dei Colleghi
function generaModuloInfograficaDati(vizMode, kpis, foto, st, isDark, isEn, uid){
  const txtM = isDark ? '#FFF5EE' : st.ink;
  const txtS = isDark ? 'rgba(255,245,238,0.78)' : st.muted;
  const boxBg = isDark ? 'rgba(255,255,255,0.06)' : '#FFFFFF';
  const bdr = isDark ? 'rgba(255,245,238,0.18)' : 'rgba(34,18,8,0.14)';
  const divC = isDark ? 'rgba(255,245,238,0.12)' : 'rgba(34,18,8,0.10)';

  if (vizMode === 0) {
    // VIZ 0: Grafico Quantitativo Orizzontale a Barre + 3 Celle KPI (stile 02_evidenze.png / 04_scala.png)
    return `
      <rect x="76" y="226" width="928" height="296" rx="22" fill="${boxBg}" stroke="${bdr}" stroke-width="1.5"/>
      <text x="108" y="268" fill="${st.acc}" font-family="Runde,sans-serif" font-weight="600" font-size="17" letter-spacing="1.6">${isEn ? 'QUANTITATIVE CLINICAL &amp; OPERATIONAL BENCHMARK' : 'CONFRONTO QUANTITATIVO CLINICO E OPERATIVO (T0 → T1)'}</text>
      <line x1="340" y1="292" x2="340" y2="454" stroke="${txtM}" stroke-opacity="0.35" stroke-width="1.5"/>
      <line x1="640" y1="292" x2="640" y2="454" stroke="${divC}" stroke-width="1" stroke-dasharray="5 5"/>
      <line x1="940" y1="292" x2="940" y2="454" stroke="${divC}" stroke-width="1" stroke-dasharray="5 5"/>
      ${kpis.map((k, idx) => {
        const ry = 304 + idx * 50;
        const barW = [580, 510, 460][idx];
        const barCol = idx === 0 ? st.acc : (idx === 1 ? (isDark ? st.sec : st.bg2) : '#5D7895');
        return `
          <text x="108" y="${ry + 24}" fill="${txtM}" font-family="Runde,sans-serif" font-weight="600" font-size="18.5">${xmlEsc(k.tag.slice(0, 20))}</text>
          <rect x="340" y="${ry + 4}" width="${barW}" height="28" rx="6" fill="${barCol}"/>
          <text x="${340 + barW - 14}" y="${ry + 24}" text-anchor="end" fill="#FFF" font-family="Runde,sans-serif" font-weight="600" font-size="17.5">${xmlEsc(k.val)} · ${xmlEsc(k.desc.slice(0, 22))}</text>
        `;
      }).join('')}
      <line x1="108" y1="468" x2="972" y2="468" stroke="${divC}" stroke-width="1"/>
      <text x="108" y="498" fill="${txtS}" font-family="Runde,sans-serif" font-weight="500" font-size="17.5">${isEn ? 'Verified across 59+ partner hospitals · CE MDR Class I Medical Device' : 'Parametri verificati nei protocolli ospedalieri LEMO · Dispositivo Medico CE Classe I'}</text>
    `;
  }
  if (vizMode === 1) {
    // VIZ 1: Timeline Architetturale a 4 Fasi Cliniche (F0 -> F1 -> F2 -> F3) + Scorecard (stile 05_sala.png)
    const steps = isEn
      ? [['F0 · Pre-Wait', 'T - 10 min', 'Baseline T0'], ['F1 · Tablet Start', '10 sec', 'Zero setup'], ['F2 · Procedure', kpis[0].val, kpis[0].tag], ['F3 · Recovery', '45 sec', 'Wipe & T1']]
      : [['F0 · Attesa', 'T - 10 min', 'Basale T0'], ['F1 · Avvio Tablet', '10 sec', 'Zero cavi'], ['F2 · Manovra', kpis[0].val, kpis[0].tag.slice(0,16)], ['F3 · Ritorno', '45 sec', 'Scala T1 & Igiene']];
    return `
      <rect x="76" y="226" width="928" height="296" rx="22" fill="${boxBg}" stroke="${bdr}" stroke-width="1.5"/>
      <text x="108" y="268" fill="${st.acc}" font-family="Runde,sans-serif" font-weight="600" font-size="17" letter-spacing="1.6">${isEn ? 'SYNCHRONIZED 4-PHASE WARD PROTOCOL (T0 → T3)' : 'ARCHITETTURA TEMPORALE DEL PROTOCOLLO IN 4 FASI (T0 → T3)'}</text>
      <line x1="186" y1="358" x2="894" y2="358" stroke="${divC}" stroke-width="5" stroke-linecap="round"/>
      <line x1="186" y1="358" x2="658" y2="358" stroke="${st.acc}" stroke-width="5" stroke-linecap="round"/>
      ${steps.map((s, idx) => {
        const cx = 186 + idx * 236;
        const hi = idx === 2;
        return `
          <circle cx="${cx}" cy="358" r="${hi ? 40 : 32}" fill="${hi ? st.acc : (isDark ? st.bg2 : '#FAF5EF')}" stroke="${hi ? st.acc : bdr}" stroke-width="3"/>
          <text x="${cx}" y="365" text-anchor="middle" fill="${hi ? '#FFF' : txtM}" font-family="Recoleta,Georgia,serif" font-weight="600" font-size="${hi ? 21 : 18}">${xmlEsc(s[1])}</text>
          <text x="${cx}" y="428" text-anchor="middle" fill="${txtM}" font-family="Runde,sans-serif" font-weight="600" font-size="19">${xmlEsc(s[0])}</text>
          <text x="${cx}" y="454" text-anchor="middle" fill="${txtS}" font-family="Runde,sans-serif" font-weight="500" font-size="16.5">${xmlEsc(s[2])}</text>
        `;
      }).join('')}
    `;
  }
  if (vizMode === 2) {
    // VIZ 2: Finestra Fotografica Panoramica + Barra 3 KPI Tabulari (stile Bento Executive)
    return `
      <clipPath id="v2p_${uid}"><rect x="76" y="226" width="928" height="296" rx="22"/></clipPath>
      <g clip-path="url(#v2p_${uid})">
        <image href="${foto}" x="76" y="226" width="928" height="296" preserveAspectRatio="xMidYMid slice"/>
        <rect x="76" y="226" width="928" height="296" fill="${st.bg1}" fill-opacity="0.42"/>
        <rect x="76" y="388" width="928" height="134" fill="rgba(9,19,30,0.88)"/>
        ${kpis.map((k, i) => {
          const cx = 76 + i * 309;
          return `
            <text x="${cx + 26}" y="422" fill="${i === 0 ? st.acc : 'rgba(255,245,238,0.75)'}" font-family="Runde,sans-serif" font-weight="600" font-size="14.5" letter-spacing="1.4">${xmlEsc(k.tag)}</text>
            <text x="${cx + 26}" y="466" fill="${i === 0 ? st.sec : '#FFF5EE'}" font-family="Recoleta,Georgia,serif" font-weight="600" font-size="36">${xmlEsc(k.val)}</text>
            <text x="${cx + 26}" y="496" fill="rgba(255,245,238,0.84)" font-family="Runde,sans-serif" font-weight="500" font-size="17">${xmlEsc(k.desc.slice(0, 28))}</text>
            ${i < 2 ? `<line x1="${cx + 309}" y1="402" x2="${cx + 309}" y2="508" stroke="rgba(255,245,238,0.16)" stroke-width="1"/>` : ''}
          `;
        }).join('')}
      </g>
      <rect x="76" y="226" width="928" height="296" rx="22" fill="none" stroke="${bdr}" stroke-width="1.5"/>
    `;
  }
  if (vizMode === 3) {
    // VIZ 3: Matrice Doppia Torre / Confronto Prima-Dopo (stile 08_hta.png / 01_lemo.png)
    return `
      <rect x="76" y="226" width="452" height="296" rx="22" fill="${boxBg}" stroke="${bdr}" stroke-width="1.5"/>
      <text x="108" y="270" fill="${txtS}" font-family="Runde,sans-serif" font-weight="600" font-size="16" letter-spacing="1.5">${isEn ? '1 · CLINICAL NEED IN WARD' : '1 · ESIGENZA CLINICA IN REPARTO'}</text>
      <text x="108" y="330" fill="${txtM}" font-family="Recoleta,Georgia,serif" font-weight="600" font-size="44">${xmlEsc(kpis[1].val)}</text>
      <text x="108" y="368" fill="${st.acc}" font-family="Runde,sans-serif" font-weight="600" font-size="20">${xmlEsc(kpis[1].tag)}</text>
      ${svgTextBlock(kpis[1].desc + ' · ' + kpis[2].desc, 108, 412, 34, 30, 3, `fill="${txtS}" font-family="Runde,sans-serif" font-weight="400" font-size="20"`)}

      <rect x="552" y="226" width="452" height="296" rx="22" fill="${st.acc}" fill-opacity="${isDark ? '0.16' : '0.09'}" stroke="${st.acc}" stroke-width="2"/>
      <text x="584" y="270" fill="${st.acc}" font-family="Runde,sans-serif" font-weight="600" font-size="16" letter-spacing="1.5">${isEn ? '2 · WITH LEMO PROTOCOL' : '2 · CON PROTOCOLLO LEMO CE'}</text>
      <text x="584" y="330" fill="${isDark ? st.sec : st.ink}" font-family="Recoleta,Georgia,serif" font-weight="600" font-size="46">${xmlEsc(kpis[0].val)}</text>
      <text x="584" y="368" fill="${txtM}" font-family="Runde,sans-serif" font-weight="600" font-size="20">${xmlEsc(kpis[0].tag)}</text>
      ${svgTextBlock(kpis[0].desc, 584, 412, 34, 30, 3, `fill="${txtM}" font-family="Runde,sans-serif" font-weight="500" font-size="20"`)}
    `;
  }
  // VIZ 4 & 5: Dossier Bento Asimmetrico (Foto Clinica a Sinistra + 3 Righe Metriche con Divisori Hairline a Destra)
  return `
    <clipPath id="v4p_${uid}"><rect x="76" y="226" width="410" height="296" rx="22"/></clipPath>
    <g clip-path="url(#v4p_${uid})">
      <image href="${foto}" x="76" y="226" width="410" height="296" preserveAspectRatio="xMidYMid slice"/>
    </g>
    <rect x="76" y="226" width="410" height="296" rx="22" fill="none" stroke="${bdr}" stroke-width="1.5"/>
    <rect x="508" y="226" width="496" height="296" rx="22" fill="${boxBg}" stroke="${bdr}" stroke-width="1.5"/>
    ${kpis.map((k, i) => {
      const ry = 226 + i * 98;
      return `
        <text x="538" y="${ry + 36}" fill="${i === 0 ? st.acc : txtS}" font-family="Runde,sans-serif" font-weight="600" font-size="15" letter-spacing="1.4">${xmlEsc(k.tag)}</text>
        <text x="538" y="${ry + 74}" fill="${txtM}" font-family="Recoleta,Georgia,serif" font-weight="600" font-size="34">${xmlEsc(k.val)}</text>
        <text x="730" y="${ry + 68}" fill="${txtS}" font-family="Runde,sans-serif" font-weight="500" font-size="18.5">${xmlEsc(k.desc.slice(0, 26))}</text>
        ${i < 2 ? `<line x1="538" y1="${ry + 98}" x2="974" y2="${ry + 98}" stroke="${divC}" stroke-width="1"/>` : ''}
      `;
    }).join('')}
  `;
}

function generaSvgCardCollega(prof, pData, idxSlot, tipo, includeFonts){
  const pool = window.LEMONS_PHOTO_POOL || { photos: [], logo_w: '', logo_c: '' };
  const st = STILI_COLLEGA[prof.id] || STILI_COLLEGA.alessandro_napoli;
  const profOrder = ['matteo','alessandro_napoli','niccolo_berni','niccolo_cesareo','lazar','emma','riccardo','sofia','alessandro_romagnosi','leonardo'];
  const pIdx = Math.max(0, profOrder.indexOf(prof.id));
  const v = pData.vis || {
    kicker: prof.reparto.toUpperCase() + ' · SLOT #' + pData.id,
    tema_breve: pData.tema,
    titolo: pData.titolo,
    sottotitolo: pData.tema,
    metrica_val: 'LEMO CE',
    metrica_lbl: 'Evidenza clinica verificata',
    citazione: pData.fonti.slice(0, 75),
    punti: [pData.titolo, pData.tema, pData.fonti.slice(0, 120)],
    ph1: (idxSlot * 3 + pIdx * 5) % 12,
    ph2: (idxSlot * 3 + pIdx * 5 + 5) % 12
  };
  const nPhotos = pool.photos.length || 1;
  const foto1 = pool.photos[(idxSlot * 3 + pIdx * 5) % nPhotos] || '';
  const foto2 = pool.photos[(idxSlot * 3 + pIdx * 5 + 4) % nPhotos] || foto1;
  const uid = `${prof.id}_${pData.id}_${tipo}`;
  const ruoloBreve = prof.ruolo.replace('@ Lemons in the Room', '').replace('· Lemons in the Room', '').trim();
  const fontCssTag = (includeFonts && window.LEMONS_FONTS_CSS) ? `<style>${window.LEMONS_FONTS_CSS}</style>` : '';
  const kpis = estraiTreKpiCollega(prof, pData, v);
  const isEn = (prof.id === 'lazar');

  if (tipo === 1) {
    // ── 4 ARCHITETTURE EDITORIALI DI COPERTINA AD ALTA AUTOREVOLEZZA (ALLINEATE ALLE NUOVE COPERTINE DI MATTEO) ──
    const posterMode = (idxSlot * 3 + pIdx * 5) % 4;
    const isLight = (posterMode === 1);
    const bgCol1 = isLight ? '#FAF5EF' : st.bg1;
    const bgCol2 = isLight ? '#F2E6D8' : st.bg2;
    const txtMain = isLight ? st.ink : '#FFF5EE';
    const txtSub  = isLight ? st.muted : 'rgba(255,245,238,0.88)';
    const ruleCol = isLight ? 'rgba(34,18,8,0.16)' : 'rgba(255,245,238,0.22)';
    const frameCol = isLight ? 'rgba(34,18,8,0.12)' : 'rgba(255,245,238,0.14)';
    const logoUri = isLight ? pool.logo_c : pool.logo_w;

    const tLen = (v.titolo || '').length;
    const hFontSize = tLen <= 95 ? 52 : (tLen <= 130 ? 46 : 41);
    const hMaxChars = tLen <= 95 ? 33 : (tLen <= 130 ? 38 : 42);
    const hLineH    = tLen <= 95 ? 60 : (tLen <= 130 ? 53 : 48);
    const titLines  = wrapLines(v.titolo, hMaxChars, 5);

    const pillRightTxt = isEn ? 'CLINICAL PROTOCOL' : 'PROTOCOLLO CLINICO';
    const topMasthead = `
      <circle cx="86" cy="76" r="6" fill="${st.acc}"/>
      <text x="106" y="83" fill="${isLight ? st.ink : '#FFF5EE'}" font-family="Runde,sans-serif" font-weight="600" font-size="18.5" letter-spacing="2">${xmlEsc(prof.reparto.toUpperCase())}</text>
      <rect x="734" y="54" width="270" height="42" rx="21" fill="${isLight ? 'rgba(255,255,255,0.86)' : 'rgba(9,19,30,0.68)'}" stroke="${ruleCol}" stroke-width="1.2"/>
      <text x="869" y="81" text-anchor="middle" fill="${isLight ? st.ink : st.sec}" font-family="Runde,sans-serif" font-weight="600" font-size="15.5" letter-spacing="1.2">${pillRightTxt}</text>
      <line x1="76" y1="112" x2="1004" y2="112" stroke="${ruleCol}" stroke-width="1"/>
    `;

    let posterBody = '';
    if (posterMode === 0 || posterMode === 3) {
      // ARCH A: Full-Bleed High-Impact Visual Frame (Fotografia a tutta altezza libera da tabelle di numeri + Titolo Concettuale Monumentale)
      const headY = 820 - Math.max(0, titLines.length - 3) * 38;
      const subY = headY + titLines.length * hLineH + 28;
      posterBody = `
        <image href="${foto1}" x="0" y="0" width="1080" height="980" preserveAspectRatio="xMidYMid slice"/>
        <rect width="1080" height="1350" fill="url(#veil_${uid})"/>
        ${topMasthead}
        ${svgHeadlineWithUnderline(v.titolo, 76, headY, hMaxChars, hLineH, 5, `fill="#FFF5EE" font-family="Recoleta,Georgia,serif" font-weight="600" font-size="${hFontSize}"`, st.acc)}
        ${svgTextBlock(v.sottotitolo, 76, subY, 54, 34, 2, `fill="rgba(255,245,238,0.88)" font-family="Runde,sans-serif" font-weight="400" font-size="26"`)}
      `;
    } else if (posterMode === 1) {
      // ARCH B: Cornice Editoriale Chiara (Titolo Concettuale in Alto + Grande Finestra Fotografica Pulita Senza Numeri)
      const subY = 178 + titLines.length * hLineH + 28;
      posterBody = `
        ${topMasthead}
        ${svgHeadlineWithUnderline(v.titolo, 76, 178, hMaxChars, hLineH, 5, `fill="${st.ink}" font-family="Recoleta,Georgia,serif" font-weight="600" font-size="${hFontSize}"`, st.acc)}
        ${svgTextBlock(v.sottotitolo, 76, subY, 54, 34, 2, `fill="${st.muted}" font-family="Runde,sans-serif" font-weight="400" font-size="25.5"`)}
        <clipPath id="bphoto_${uid}"><rect x="76" y="546" width="928" height="630" rx="24"/></clipPath>
        <g clip-path="url(#bphoto_${uid})">
          <image href="${foto1}" x="76" y="546" width="928" height="630" preserveAspectRatio="xMidYMid slice"/>
        </g>
        <rect x="76" y="546" width="928" height="630" rx="24" fill="none" stroke="rgba(34,18,8,0.18)" stroke-width="1.5"/>
      `;
    } else {
      // ARCH C: Cornice Architettonica Notturna (Grande Finestra Fotografica Superiore 100% Libera + Titolo Concettuale Sotto)
      const subY = 824 + titLines.length * hLineH + 28;
      posterBody = `
        ${topMasthead}
        <clipPath id="wframe_${uid}"><rect x="76" y="134" width="928" height="610" rx="24"/></clipPath>
        <g clip-path="url(#wframe_${uid})">
          <image href="${foto1}" x="76" y="134" width="928" height="610" preserveAspectRatio="xMidYMid slice"/>
        </g>
        <rect x="76" y="134" width="928" height="610" rx="24" fill="none" stroke="rgba(255,245,238,0.22)" stroke-width="1.5"/>
        ${svgHeadlineWithUnderline(v.titolo, 76, 824, hMaxChars, hLineH, 5, `fill="#FFF5EE" font-family="Recoleta,Georgia,serif" font-weight="600" font-size="${hFontSize}"`, st.acc)}
        ${svgTextBlock(v.sottotitolo, 76, subY, 54, 34, 2, `fill="rgba(255,245,238,0.88)" font-family="Runde,sans-serif" font-weight="400" font-size="25.5"`)}
      `;
    }

    return svgToDataUri(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1350" width="1080" height="1350">
        <defs>
          ${fontCssTag}
          <linearGradient id="bg_${uid}" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="${bgCol1}"/>
            <stop offset="100%" stop-color="${bgCol2}"/>
          </linearGradient>
          <linearGradient id="veil_${uid}" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="${st.bg1}" stop-opacity="0.50"/>
            <stop offset="18%" stop-color="${st.bg1}" stop-opacity="0.06"/>
            <stop offset="38%" stop-color="${st.bg1}" stop-opacity="0.18"/>
            <stop offset="56%" stop-color="${st.bg1}" stop-opacity="0.93"/>
            <stop offset="72%" stop-color="${st.bg1}" stop-opacity="1"/>
            <stop offset="100%" stop-color="${st.bg2}" stop-opacity="1"/>
          </linearGradient>
          <linearGradient id="dock_${uid}" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#081420" stop-opacity="0"/>
            <stop offset="50%" stop-color="#081420" stop-opacity="0.14"/>
            <stop offset="100%" stop-color="#081420" stop-opacity="0.88"/>
          </linearGradient>
          <clipPath id="av_${uid}"><circle cx="110" cy="1260" r="32"/></clipPath>
        </defs>
        <rect width="1080" height="1350" fill="url(#bg_${uid})"/>
        <rect x="24" y="24" width="1032" height="1302" rx="20" fill="none" stroke="${frameCol}" stroke-width="1"/>
        ${posterBody}
        <line x1="76" y1="1206" x2="1004" y2="1206" stroke="${ruleCol}" stroke-width="1.5"/>
        <g clip-path="url(#av_${uid})">
          <image href="${prof.avatar}" x="78" y="1228" width="64" height="64" preserveAspectRatio="xMidYMid slice"/>
        </g>
        <circle cx="110" cy="1260" r="32" fill="none" stroke="${st.acc}" stroke-width="2.5"/>
        <text x="158" y="1254" fill="${txtMain}" font-family="Runde,sans-serif" font-weight="600" font-size="25">${xmlEsc(prof.nome)}</text>
        <text x="158" y="1284" fill="${txtSub}" font-family="Runde,sans-serif" font-weight="400" font-size="19.5">${xmlEsc(ruoloBreve.slice(0, 58))}</text>
        ${logoUri ? `<image href="${logoUri}" x="828" y="1234" width="176" height="52" preserveAspectRatio="xMaxYMid meet"/>` : ''}
      </svg>`
    );
  } else {
    // ── IMMAGINE 2: SCHEDA DATI & INFOGRAFICA CLINICA AD ALTA DENSITÀ (STILE BAOYU-INFOGRAPHIC × NUOVE_SCHEDE.PY) ──
    const vizMode = (idxSlot + pIdx * 2) % 5;
    const isDarkCard = (vizMode === 1 || vizMode === 4);
    const bg1 = isDarkCard ? st.bg1 : '#FAF5EF';
    const bg2 = isDarkCard ? st.bg2 : '#F3EAE0';
    const txtMain = isDarkCard ? '#FFF5EE' : st.ink;
    const txtSub  = isDarkCard ? 'rgba(255,245,238,0.80)' : st.muted;
    const boxBg   = isDarkCard ? 'rgba(255,255,255,0.06)' : '#FFFFFF';
    const boxRule = isDarkCard ? 'rgba(255,245,238,0.18)' : 'rgba(34,18,8,0.14)';
    const logoUri = isDarkCard ? pool.logo_w : pool.logo_c;

    const topVizSvg = generaModuloInfograficaDati(vizMode, kpis, foto2, st, isDarkCard, isEn, uid);
    const rowLabels = isEn
      ? ['01 · PEER-REVIEWED EVIDENCE', '02 · WARD IMPLEMENTATION PROTOCOL', '03 · MEASURED HOSPITAL IMPACT']
      : ['01 · EVIDENZA DALLA LETTERATURA', '02 · PROTOCOLLO OPERATIVO IN CORSIA', '03 · IMPATTO MISURATO NEL REPARTO'];

    const rowsAnalytical = [0, 1, 2].map(k => {
      const ry = 550 + k * 184;
      const isHi = k === 0;
      return `
        <rect x="76" y="${ry}" width="928" height="164" rx="20" fill="${boxBg}" stroke="${isHi ? st.acc : boxRule}" stroke-width="${isHi ? 2 : 1.5}"/>
        <rect x="104" y="${ry + 30}" width="52" height="52" rx="14" fill="${isHi ? st.acc : (isDarkCard ? 'rgba(255,255,255,0.12)' : '#F2E6D8')}"/>
        <text x="130" y="${ry + 65}" text-anchor="middle" fill="${isHi ? '#FFF' : txtMain}" font-family="Recoleta,Georgia,serif" font-weight="600" font-size="26">0${k + 1}</text>
        <text x="180" y="${ry + 44}" fill="${isHi ? st.acc : txtSub}" font-family="Runde,sans-serif" font-weight="600" font-size="16" letter-spacing="1.5">${rowLabels[k]}</text>
        ${svgTextBlock(v.punti[k], 180, ry + 80, 56, 32, 2, `fill="${txtMain}" font-family="Runde,sans-serif" font-weight="400" font-size="22.5"`)}
      `;
    }).join('');

    return svgToDataUri(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1350" width="1080" height="1350">
        <defs>
          ${fontCssTag}
          <linearGradient id="bg2_${uid}" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="${bg1}"/>
            <stop offset="100%" stop-color="${bg2}"/>
          </linearGradient>
          <clipPath id="av2_${uid}"><circle cx="110" cy="1260" r="32"/></clipPath>
        </defs>
        <rect width="1080" height="1350" fill="url(#bg2_${uid})"/>
        <rect x="24" y="24" width="1032" height="1302" rx="20" fill="none" stroke="${boxRule}" stroke-width="1"/>
        <circle cx="86" cy="78" r="6" fill="${st.acc}"/>
        <text x="106" y="85" fill="${st.acc}" font-family="Runde,sans-serif" font-weight="600" font-size="18.5" letter-spacing="2">${isEn ? 'CLINICAL &amp; ENGINEERING DOSSIER · ' : 'DOSSIER CLINICO &amp; OPERATIVO · '}${xmlEsc(prof.reparto.toUpperCase())}</text>
        ${svgTextBlock(v.tema_breve, 76, 144, 38, 48, 2, `fill="${txtMain}" font-family="Recoleta,Georgia,serif" font-weight="600" font-size="42"`)}
        <line x1="76" y1="204" x2="1004" y2="204" stroke="${boxRule}" stroke-width="1.5"/>
        ${topVizSvg}
        ${rowsAnalytical}
        <text x="76" y="1142" fill="${txtSub}" font-family="Runde,sans-serif" font-weight="600" font-size="18">${isEn ? 'Reference: ' : 'Riferimento: '}${xmlEsc((v.citazione || '').slice(0, 88))}</text>
        <line x1="76" y1="1206" x2="1004" y2="1206" stroke="${boxRule}" stroke-width="1.5"/>
        <g clip-path="url(#av2_${uid})">
          <image href="${prof.avatar}" x="78" y="1228" width="64" height="64" preserveAspectRatio="xMidYMid slice"/>
        </g>
        <circle cx="110" cy="1260" r="32" fill="none" stroke="${st.acc}" stroke-width="2.5"/>
        <text x="158" y="1254" fill="${txtMain}" font-family="Runde,sans-serif" font-weight="600" font-size="25">${xmlEsc(prof.nome)}</text>
        <text x="158" y="1284" fill="${txtSub}" font-family="Runde,sans-serif" font-weight="400" font-size="19.5">${xmlEsc(ruoloBreve.slice(0, 58))}</text>
        ${logoUri ? `<image href="${logoUri}" x="828" y="1234" width="176" height="52" preserveAspectRatio="xMaxYMid meet"/>` : ''}
      </svg>`
    );
  }
}

// Calcola la larghezza ottica precisa di una stringa per allineare al pixel la sottolineatura nelle copertine profilo
function stimaLarghezzaTestoBanner(str, fontSize, isRecoleta){
  let w = 0;
  const s = String(str || '');
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === ' ') w += fontSize * 0.27;
    else if ('iljtI1.,;:\'’!|'.includes(ch)) w += fontSize * 0.27;
    else if ('rf()[]'.includes(ch)) w += fontSize * 0.36;
    else if ('mwMW'.includes(ch)) w += fontSize * 0.80;
    else if (ch === ch.toUpperCase() && ch !== ch.toLowerCase()) w += fontSize * 0.64;
    else w += fontSize * (isRecoleta ? 0.50 : 0.525);
  }
  return w;
}

// Restituisce il concetto visivo essenziale (2 righe brevi di 14-17 caratteri + sottotitolo concettuale, ZERO numeri) per le Copertine Profilo LinkedIn (4752x1188) dei colleghi, coordinate esattamente con quella di Matteo
function ottieniSpecBannerProfilo(prof, isEn){
  const specs = {
    alessandro_napoli: {
      l1_it: 'Terapie digitali', l2_pre_it: 'in ', l2_und_it: 'cura ospedaliera',
      sub_it: 'INNOVAZIONE CLINICA NEGLI OSPEDALI',
      l1_en: 'Digital therapy,', l2_pre_en: '', l2_und_en: 'built for hospitals',
      sub_en: 'CLINICAL INNOVATION IN HOSPITALS'
    },
    niccolo_berni: {
      l1_it: 'Realtà virtuale', l2_pre_it: 'nel ', l2_und_it: 'vivo del reparto',
      sub_it: 'PERCORSI CLINICI NEGLI OSPEDALI',
      l1_en: 'Virtual reality,', l2_pre_en: '', l2_und_en: 'built for ward life',
      sub_en: 'CLINICAL PATHWAYS IN HOSPITALS'
    },
    niccolo_cesareo: {
      l1_it: 'Valore clinico', l2_pre_it: 'e ', l2_und_it: 'cura sostenibile',
      sub_it: 'SOSTENIBILITÀ E GOVERNANCE SANITARIA',
      l1_en: 'Clinical value,', l2_pre_en: '', l2_und_en: 'sustainable in care',
      sub_en: 'HEALTHCARE OPERATIONS & GOVERNANCE'
    },
    lazar: {
      l1_it: 'Sistemi immersivi', l2_pre_it: 'per ', l2_und_it: 'la cura clinica',
      sub_it: 'ARCHITETTURE XR PER GLI OSPEDALI',
      l1_en: 'Immersive systems,', l2_pre_en: '', l2_und_en: 'engineered for care',
      sub_en: 'CLINICAL XR SYSTEMS FOR HOSPITALS'
    },
    emma: {
      l1_it: 'Calmare l’ansia', l2_pre_it: 'nella ', l2_und_it: 'cura in reparto',
      sub_it: 'PSICOLOGIA CLINICA NEGLI OSPEDALI',
      l1_en: 'Calming anxiety,', l2_pre_en: '', l2_und_en: 'right at the bedside',
      sub_en: 'CLINICAL PSYCHOLOGY IN HOSPITALS'
    },
    riccardo: {
      l1_it: 'Portare la ricerca', l2_pre_it: 'dentro ', l2_und_it: 'ogni reparto',
      sub_it: 'RETE CLINICA NEGLI OSPEDALI PARTNER',
      l1_en: 'Bringing research,', l2_pre_en: '', l2_und_en: 'into hospital wards',
      sub_en: 'CLINICAL PARTNERSHIPS IN HOSPITALS'
    },
    sofia: {
      l1_it: 'Raccontare la cura', l2_pre_it: 'con ', l2_und_it: 'voce scientifica',
      sub_it: 'COMUNICAZIONE CLINICA E UMANIZZAZIONE',
      l1_en: 'Telling the story,', l2_pre_en: '', l2_und_en: 'of clinical care',
      sub_en: 'SCIENTIFIC COMMUNICATION & CARE'
    },
    alessandro_romagnosi: {
      l1_it: 'Accanto ai reparti', l2_pre_it: 'in ', l2_und_it: 'ogni singolo turno',
      sub_it: 'FORMAZIONE CLINICA NEGLI OSPEDALI',
      l1_en: 'Supporting teams,', l2_pre_en: '', l2_und_en: 'across every shift',
      sub_en: 'ON-WARD CLINICAL TRAINING & CARE'
    },
    leonardo: {
      l1_it: 'Sicurezza clinica', l2_pre_it: 'al ', l2_und_it: 'letto del paziente',
      sub_it: 'INGEGNERIA OPERATIVA IN OSPEDALE',
      l1_en: 'Clinical safety,', l2_pre_en: '', l2_und_en: 'ready at the bedside',
      sub_en: 'CLINICAL OPERATIONS IN HOSPITALS'
    }
  };
  const s = specs[prof.id] || specs.alessandro_napoli;
  return {
    l1: isEn ? s.l1_en : s.l1_it,
    l2_pre: isEn ? s.l2_pre_en : s.l2_pre_it,
    l2_und: isEn ? s.l2_und_en : s.l2_und_it,
    sub: isEn ? s.sub_en : s.sub_it
  };
}

function generaBannerProfiloCollega(prof, varIdx, lang){
  const pool = window.LEMONS_PHOTO_POOL || { photos: [], logo_w: '', logo_c: '', master_v1: '', master_v2: '', master_v3: '' };
  const isEn = (lang === 'en') || (!lang && prof.id === 'lazar');
  const v = (varIdx || 1);
  const fontCssTag = window.LEMONS_FONTS_CSS ? `<style>${window.LEMONS_FONTS_CSS}</style>` : '';
  const spec = ottieniSpecBannerProfilo(prof, isEn);
  const uid = `${prof.id}_v${v}_${isEn ? 'en' : 'it'}`;

  // Sceglie il fondo master identico alle 3 varianti ufficiali di Matteo (v1: Pantone Caldo, v2: Master Originale, v3: Ponte Blu Acciaio 5405 C)
  const bgMaster = (v === 3 && pool.master_v3)
    ? pool.master_v3
    : ((v === 2 && pool.master_v2) ? pool.master_v2 : (pool.master_v1 || pool.master_v3 || ''));

  const isRecoleta = (v === 2);
  const hFontFam = isRecoleta ? 'Recoleta,Georgia,serif' : 'Runde,system-ui,sans-serif';
  const hFontW   = '600';
  const hFontSz  = isRecoleta ? 55 : 53;

  const baseX  = 560;
  const preW   = stimaLarghezzaTestoBanner(spec.l2_pre || '', hFontSz, isRecoleta);
  const undW   = stimaLarghezzaTestoBanner(spec.l2_und || '', hFontSz, isRecoleta);
  const uStartX = Math.round(baseX + preW);
  const uWidth  = Math.round(undW);

  return svgToDataUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1584 396" width="1584" height="396">
    <defs>
      ${fontCssTag}
      <radialGradient id="scrim_${uid}" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#A22A0C" stop-opacity="0.28"/>
        <stop offset="58%" stop-color="#A22A0C" stop-opacity="0.12"/>
        <stop offset="100%" stop-color="#A22A0C" stop-opacity="0"/>
      </radialGradient>
      <filter id="tsh_${uid}" x="-10%" y="-10%" width="120%" height="130%">
        <feDropShadow dx="0" dy="2" stdDeviation="6" flood-color="#5C1606" flood-opacity="0.28"/>
      </filter>
    </defs>
    ${bgMaster ? `<image href="${bgMaster}" x="0" y="0" width="1584" height="396" preserveAspectRatio="none"/>` : '<rect width="1584" height="396" fill="#D9581F"/>'}
    <ellipse cx="760" cy="198" rx="285" ry="215" fill="url(#scrim_${uid})" style="mix-blend-mode:multiply"/>
    <g filter="url(#tsh_${uid})">
      <text x="${baseX}" y="138" fill="#FFF3EB" font-family="${hFontFam}" font-weight="${hFontW}" font-size="${hFontSz}" letter-spacing="-0.8">${xmlEsc(spec.l1)}</text>
      <text x="${baseX}" y="196" fill="#FFF3EB" font-family="${hFontFam}" font-weight="${hFontW}" font-size="${hFontSz}" letter-spacing="-0.8">${xmlEsc((spec.l2_pre || '') + (spec.l2_und || ''))}</text>
      <rect x="${uStartX}" y="203" width="${uWidth}" height="4.5" rx="2.2" fill="#FFF3EB" opacity="0.96"/>
      <text x="${baseX}" y="244" fill="#FFF3EB" opacity="0.96" font-family="Runde,sans-serif" font-weight="600" font-size="19" letter-spacing="1.4">${xmlEsc(spec.sub)}</text>
      ${pool.logo_w ? `<image href="${pool.logo_w}" x="${baseX}" y="267" width="132" height="37" preserveAspectRatio="xMinYMid meet"/>` : ''}
    </g>
  </svg>`);
}

function rasterizzaSvgInBlobUrl(svgUri, width, height, mime, cacheKey){
  if (!svgUri) return Promise.resolve('');
  if (cacheKey && BLOB_URLS[cacheKey]) return Promise.resolve(BLOB_URLS[cacheKey]);
  return new Promise(resolve => {
    const im = new Image();
    im.onload = () => {
      try {
        const c = document.createElement('canvas');
        c.width = width;
        c.height = height;
        const ctx = c.getContext('2d');
        ctx.drawImage(im, 0, 0, width, height);
        const dataUrl = c.toDataURL(mime || 'image/jpeg', 0.96);
        const blob = dataUriToBlob(dataUrl, true);
        const bUrl = URL.createObjectURL(blob);
        if (cacheKey) {
          ASSET_URIS[cacheKey] = dataUrl;
          BLOB_URLS[cacheKey] = bUrl;
        }
        resolve(bUrl);
      } catch (e) {
        resolve('');
      }
    };
    im.onerror = () => resolve('');
    im.src = svgUri;
  });
}


export { STILI_COLLEGA, generaSvgCardCollega, generaBannerProfiloCollega, rasterizzaSvgInBlobUrl, estraiTreKpiCollega };
