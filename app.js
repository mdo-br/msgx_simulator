'use strict';
const PHASES = ['Inicialização', 'Acordo de chaves', 'Troca de mensagens', 'Renovação de sessão'];
const DETAILS = [
  ['Bob publica os bundles', 'Bob gera e publica os conjuntos públicos de Γ e Σ no HS_B. As chaves privadas permanecem no cliente.', 'Dois bundles independentes; o servidor armazena material público.'],
  ['Alice consulta as pré-chaves', 'Alice solicita os bundles de Bob ao HS_A. A federação consulta o HS_B e devolve o material público.', 'O acordo pode começar sem uma resposta imediata de Bob.'],
  ['Verificar e derivar', 'Alice verifica cada assinatura. Se qualquer verificação falhar, o acordo é abortado. Em cada ramo, três ECDH e um segredo KEM alimentam a HKDF.', 'OLM_ROOT e GC_ROOT separam os domínios de derivação. O texto original da figura está preservado abaixo; “abort” aplica-se à falha de verificação.'],
  ['Proteger o setup do msgGX', 'Alice cria o setup da sessão de grupo e o protege primeiro com Γ, depois com Σ.', 'São duas cifras sobre o mesmo setup, não duas mensagens independentes.'],
  ['Transportar a PreKeyMessage', 'A mensagem leva os dois ciphertexts KEM, as chaves públicas efêmeras de Alice e o setup protegido pelos homeservers.', 'Os servidores transportam o envelope; não recebem o setup em claro.'],
  ['Bob reconstrói a sessão', 'Bob decapsula nos dois ramos, reconstrói as derivações e remove a camada Σ antes da camada Γ. Inicializa então o msgGX.', 'Os identificadores de chave coincidem entre os participantes; suas chaves privadas permanecem distintas.'],
  ['Um evento para a sala', 'Os dois ratchets simétricos do msgGX avançam com um índice compartilhado. Alice publica um único evento com dupla camada.', 'O envio de Alice é independente de G; os homeservers ainda precisam distribuir o evento.'],
  ['Renovar e distribuir', 'Ao atingir R mensagens ou timeout, o plano de controle msgX protege um novo setup e o distribui por G−1 canais individuais.', 'Fronteira idealizada: assumimos novo material do par disponível. ECDH entra em cada avanço de raiz; o segredo PQ entra apenas nas fronteiras 2ᵖ.'],
  ['Bob adota o novo setup', 'Bob avança o estado correspondente, remove as duas camadas do setup e reinicializa o msgGX. A troca de mensagens pode continuar.', 'A distribuição é O(G). O custo por evento publicado por Alice permanece independente do tamanho da sala.']
];
const $ = id => document.getElementById(id);
let step = -1, session = 0, index = 0, published = 0, setups = 0;
let bobOnline = true, bobSession = 0, bobIndex = 0;
let conversation = [], deliveryQueue = [];
let chatOpen = false, established = false, busy = false, epoch = 0, cancelDelay = null;
let registered = false, bundlesGenerated = false, registration = 'idle';
let activeOperation = -1, aliceDerived = false, groupCreated = false;
let inspection = null;
const CANCELLED = Symbol('cancelled');
const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function reset() {
  epoch++; if (cancelDelay) cancelDelay();
  step = -1; session = index = published = setups = bobSession = bobIndex = 0;
  bobOnline = true; conversation = []; deliveryQueue = [];
  chatOpen = established = busy = false;
  registered = bundlesGenerated = false; registration = 'idle';
  activeOperation = -1; aliceDerived = groupCreated = false; inspection = null;
  $('message').value = ''; $('messages').replaceChildren();
  $('payload').textContent = 'Mensagem'; $('event').textContent = 'Nenhum evento publicado.';
  render();
}
async function delay(run) {
  if (run !== epoch) throw CANCELLED;
  await new Promise(resolve => {
    const finish = () => { cancelDelay = null; resolve(); };
    const timer = setTimeout(finish, Number($('speed').value));
    cancelDelay = () => { clearTimeout(timer); finish(); };
  });
  if (run !== epoch) throw CANCELLED;
}
function scrollToCurrentOperation(startOfStep = false) {
  if (inspection) return;
  const timeline = $('timeline');
  const current = timeline.querySelector('.operation-row.active') || timeline.querySelector('.flow-step.current');
  if (!current) return;
  const viewport = timeline.getBoundingClientRect();
  const padding = 16;
  const card = current.closest('.flow-step');
  const cardRect = card && card.getBoundingClientRect();
  // Keep the whole event, including its heading, visible whenever it fits.
  const target = cardRect && (startOfStep || cardRect.height <= timeline.clientHeight - 2 * padding) ? cardRect : current.getBoundingClientRect();
  const top = viewport.top + timeline.clientTop + padding;
  const bottom = viewport.top + timeline.clientTop + timeline.clientHeight - padding;
  if (startOfStep || target.top < top || target.bottom > bottom) {
    timeline.scrollTop = Math.max(0, timeline.scrollTop + target.top - top);
  }
}
async function stage(value, run) {
  if (run !== epoch) throw CANCELLED;
  step = value;
  for (let n = 0; n < OPERATIONS[value].length; n++) {
    activeOperation = n; render();
    scrollToCurrentOperation(n === 0);
    await delay(run);
  }
  if (value === 2) aliceDerived = true;
  if (value === 3) groupCreated = true;
}
function render() {
  $('counter').textContent = step < 0 ? registered ? 'Aguardando uma mensagem' : busy ? 'Registro em execução' : 'Aguardando registro de Alice' : `Passo ${step + 1} · ${step} de 8${busy ? ' · em execução' : ''}`;
  const phase = step < 0 ? 0 : FLOW[step].phase;
  $('phases').innerHTML = PHASES.map((p,i) => `<span class="phase-tab ${phase === i+1 ? 'active' : ''}">0${i+1} · ${p}</span>`).join('');
  renderTimeline();
  renderExplanation();
  $('message').disabled = !chatOpen;
  $('send').disabled = !chatOpen || busy;
  $('renew').disabled = !established || busy;
  $('chat-status').textContent = `Sessão ${session} · ${index}/${$('interval').value} mensagens · ${published} eventos publicados · ${setups} setups distribuídos`;
  renderKeys(); renderPhones();
}
function renderTimeline() {
  const previousScroll = $('timeline').scrollTop;
  const focused = document.activeElement;
  const focusedData = focused && focused.dataset;
  const focusSelector = focusedData && focusedData.inspectRegistration ? `[data-inspect-registration="${focusedData.inspectRegistration}"]` : focusedData && focusedData.inspectStep !== undefined ? `[data-inspect-step="${focusedData.inspectStep}"]${focusedData.inspectOperation !== undefined ? `[data-inspect-operation="${focusedData.inspectOperation}"]` : ':not([data-inspect-operation])'}` : null;
  const registrationFlow = `<div class="registration-flow"><span class="eyebrow">REGISTRO · PREPARAÇÃO DIDÁTICA</span><div class="flow-step ${registration === 'generating' ? 'current' : !bundlesGenerated ? 'future' : ''}"><button type="button" class="step-heading" data-inspect-registration="generating"><strong>Alice gera e assina os bundles Γ e Σ</strong></button><div class="routes"><span class="local" style="grid-column:1">IK + EK + PQE + Sig</span></div></div><div class="flow-step ${registration === 'publishing' ? 'current' : !registered ? 'future' : ''}"><button type="button" class="step-heading" data-inspect-registration="publishing"><strong>Publicar Γ.bundle e Σ.bundle no HS_A</strong></button><div class="routes"><span class="route" style="grid-column:1/3;--route-columns:2">publish(Γ.bundle, Σ.bundle)</span></div></div><p class="muted">Preparação anterior ao fluxo da Figura 1 do artigo msgX. Todas as chaves privadas ficam no celular.</p></div>`;
  $('timeline').innerHTML = registrationFlow + '<p class="muted">Os bundles públicos Γ e Σ de Bob já estão disponíveis no HS_B. A numeração da Figura 1 do artigo é preservada a partir do passo ②.</p>' + FLOW.map((s,i) => {
    if (i === 0) return '';
    const routes = s.routes.map(r => `<div class="routes"><span class="route ${r.from > r.to ? 'reverse' : ''}" style="grid-column:${Math.min(r.from,r.to)+1}/${Math.max(r.from,r.to)+2};--route-columns:${Math.abs(r.from-r.to)+1}">${esc(r.label)}</span></div>`).join('');
    const local = !s.routes.length ? `<div class="routes"><span class="local" style="grid-column:${i === 5 || i === 8 ? 4 : 1}">Computação local</span></div>` : '';
    const operations = OPERATIONS[i].map((operation,n) => `<button type="button" data-inspect-step="${i}" data-inspect-operation="${n}" aria-pressed="${!!inspection && inspection.step === i && inspection.operation === n}" class="operation-row ${i === step && n === activeOperation ? 'active' : ''} ${inspection && inspection.step === i && inspection.operation === n ? 'inspected' : ''}"><span>${i+1}.${n+1}</span><span class="operation-label"><strong>${esc(operation.title)}</strong><small>${esc(operation.actor)}</small></span></button>`).join('');
    return `<div class="flow-step ${i === step ? 'current' : i > step ? 'future' : ''} ${inspection && inspection.step === i ? 'inspected-step' : ''}" ${i === step ? 'aria-current="step"' : ''}><button type="button" class="step-heading" data-inspect-step="${i}" aria-label="Consultar o passo ${i+1}: ${esc(DETAILS[i][0])}"><strong>${i+1}. ${DETAILS[i][0]}</strong><span aria-hidden="true">↗</span></button>${local}${routes}<span class="mini">Fase ${s.phase} · ${OPERATIONS[i].length} operações</span><div class="operation-list">${operations}</div></div>`;
  }).join('');
  if (focusSelector) {
    const replacement = $('timeline').querySelector(focusSelector);
    if (replacement) replacement.focus({preventScroll:true});
  }
  $('timeline').scrollTop = previousScroll;
}
function renderExplanation() {
  const viewStep = inspection ? inspection.step : step;
  const viewOperation = inspection ? inspection.operation : activeOperation;
  const viewRegistration = inspection && inspection.registration ? inspection.registration : registration;
  const phase = viewStep < 0 ? 0 : FLOW[viewStep].phase;
  $('inspection-status').textContent = inspection ? (viewStep < 0 ? 'Consultando registro de Alice' : `Consultando passo ${viewStep+1} · operação ${viewOperation+1}`) : 'Acompanhando a execução';
  $('follow-execution').hidden = !inspection;
  $('phase-name').textContent = viewStep < 0 ? 'O PROTOCOLO ACOMPANHA A CONVERSA' : `FASE ${phase} · ${PHASES[phase-1].toUpperCase()}`;
  $('step-title').textContent = viewStep < 0 ? 'Envie a primeira mensagem' : DETAILS[viewStep][0];
  $('description').textContent = viewStep < 0 ? 'Clique em Bob no celular de Alice, digite uma mensagem e envie. A inicialização e o acordo de chaves acontecem automaticamente; cada operação aparece aqui.' : DETAILS[viewStep][1];
  $('formula').textContent = viewStep < 0 ? 'msgX → controle e distribuição de setups\nmsgGX → eventos de grupo' : FLOW[viewStep].formula;
  $('insight').textContent = viewStep < 0 ? 'Nenhuma operação do protocolo exige uma ação adicional no aplicativo.' : DETAILS[viewStep][2];
  if (viewStep < 0 && (!registered || inspection)) {
    $('phase-name').textContent = 'ANTES DA CONVERSA · REGISTRO DE ALICE';
    $('step-title').textContent = viewRegistration === 'generating' ? 'Gerar os bundles de Alice' : viewRegistration === 'publishing' ? 'Publicar os bundles públicos' : 'Welcome, Alice';
    $('description').textContent = 'Clique em Register no celular de Alice. A geração dos bundles e sua publicação são apresentados aqui automaticamente. Nenhum dado pessoal é solicitado.';
    $('formula').textContent = 'Para cada ramo b ∈ {Γ, Σ}:\n  b.IK_A ← IdentityKeyPair()\n  b.EK_A ← ECKeyPair()\n  b.PQE_A ← KEMKeyPair()\n  b.Sig_A ← Sign(b.IK_A^priv, pré-chaves públicas do ramo)\n  b.bundle_A ← ⟨b.IK_A^pub, b.EK_A^pub, b.PQE_A^pub, b.Sig_A⟩\n\nAlice → HS_A: publish(Γ.bundle_A, Σ.bundle_A)';
    $('insight').textContent = 'Esta preparação didática antecede o fluxo da Figura 1 do artigo msgX. Publicar bundles não estabelece ainda uma sessão com Bob.';
  }
  const operation = viewStep >= 0 && viewOperation >= 0 ? OPERATIONS[viewStep][viewOperation] : null;
  $('operation-detail').hidden = $('operation-result').hidden = !operation;
  if (operation) {
    $('operation-position').textContent = `OPERAÇÃO ${viewStep+1}.${viewOperation+1} · ${viewOperation+1}/${OPERATIONS[viewStep].length}`;
    $('operation-title').textContent = operation.title;
    $('operation-actor').textContent = operation.actor;
    $('operation-input').textContent = operation.input;
    $('formula').textContent = operation.formula;
    $('operation-output').textContent = operation.output;
    const articleLink = document.createElement('a');
    articleLink.href = 'https://sol.sbc.org.br/index.php/sbseg/article/view/44327';
    articleLink.target = '_blank'; articleLink.rel = 'noopener noreferrer';
    articleLink.textContent = 'Artigo msgX · SBC Open Library';
    const reference = document.createElement('span');
    reference.textContent = ' — ' + operation.source.replace(/^Artigo msgX · /, '');
    $('operation-source').replaceChildren(articleLink, reference);
    $('source-formula').textContent = FLOW[viewStep].formula;
  }
}
function renderKeys() {
  const owner = $('owner').value;
  if (owner === 'Servidores') {
    $('keys').innerHTML = `<p class="muted">HS_B: Γ.bundle_B + Σ.bundle_B públicos de Bob previamente publicados.<br>HS_A: ${registered ? 'Γ.bundle_A + Σ.bundle_A públicos registrados' : 'nenhum bundle de Alice registrado'}; ${step >= 1 ? 'resposta pública de Bob encaminhada' : 'nenhuma consulta a Bob'}.</p><pre>${registered ? 'Γ.bundle_A = ⟨Γ.IK_A^pub, Γ.EK_A^pub, Γ.PQE_A^pub, Γ.Sig_A⟩\nΣ.bundle_A = ⟨Σ.IK_A^pub, Σ.EK_A^pub, Σ.PQE_A^pub, Σ.Sig_A⟩\n\n' : ''}${step >= 4 ? 'PreKeyMessage: Γ.ct, Σ.ct, EK públicas, setup*\n' : ''}${published ? `Eventos de grupo protegidos: ${published}\n` : ''}${setups ? `Setups protegidos distribuídos: ${setups}\n` : ''}Sem chaves privadas, root keys ou mensagem em claro.</pre>`;
    return;
  }
  const initialized = owner === 'Alice' ? aliceDerived : established;
  const rootSession = owner === 'Bob' ? bobSession : session;
  const groupIndex = owner === 'Bob' ? bobIndex : index;
  const groupReady = owner === 'Alice' ? groupCreated : established;
  const generated = owner === 'Bob' ? true : bundlesGenerated;
  const suffix = owner === 'Alice' ? 'A' : 'B';
  $('keys').innerHTML = ['Γ', 'Σ'].map((b, k) => {
    const rows = [
      ['IK', generated ? `${b}.IK_${owner === 'Alice' ? 'A' : 'B'} (privada local)` : '—'],
      ['EK', generated ? `${b}.EK_${owner === 'Alice' ? 'A' : 'B'} (privada local)` : '—'],
      ['PQE', generated ? `${b}.PQE_${suffix} (privada local)` : '—'],
      ['Sig', generated ? `${b}.Sig_${suffix} (assinada com ${b}.IK_${suffix}^priv)` : '—'],
      ['bundle', generated ? `⟨${b}.IK_${suffix}^pub, ${b}.EK_${suffix}^pub, ${b}.PQE_${suffix}^pub, ${b}.Sig_${suffix}⟩` : '—'],
      ['msgX R', initialized ? `${b}.R_${rootSession}` : '—'],
      ['msgX C', initialized ? `${b}.C_${rootSession},0` : '—'],
      ['msgX M', initialized ? `${b}.M_${rootSession},0 · HMAC(C, ${k ? '0x3' : '0x1'})` : '—'],
      ['msgGX', groupReady ? `${b}.sessão_${rootSession} · índice ${groupIndex}` : '—'],
      ['GX M', groupReady && groupIndex ? `${b}.msgGX.M_${rootSession},${groupIndex} (usada; descartada no modelo)` : '—']
    ];
    return `<div class="branch ${k ? 'sigma' : 'gamma'}"><strong>${b} · ${k ? 'Soberano' : 'Padrão'}</strong><dl>${rows.map(([a,v]) => `<dt>${a}</dt><dd>${esc(v)}</dd>`).join('')}</dl></div>`;
  }).join('');
}

function receive(event) {
  bobSession = event.session; bobIndex = event.index;
  if (event.type === 'message') event.record.delivered = true;
}
function deliver(event) { if (bobOnline) receive(event); else deliveryQueue.push(event); }
function renderPhones() {
  $('welcome-alice').hidden = registered;
  $('register-alice').disabled = busy;
  $('register-alice').textContent = busy && !registered ? 'Registrando…' : 'Register';
  $('bob-contact').hidden = !registered || chatOpen;
  $('alice-screen').hidden = !registered;
  $('alice-chat-heading').hidden = !chatOpen;
  $('send-form').hidden = !chatOpen;
  $('alice-state').textContent = bobOnline ? 'online' : 'offline';
  $('bob-state').textContent = bobOnline ? 'online' : 'offline';
  $('bob-network').textContent = bobOnline ? '● Wi-Fi ▰' : '○ Desligado';
  $('bob-screen').classList.toggle('screen-off', !bobOnline);
  $('bob-power').textContent = bobOnline ? 'Desligar celular' : 'Ligar celular';
  $('bob-power').disabled = !established || busy;
  for (const who of ['alice','bob']) {
    const screen = $(`${who}-screen`); screen.replaceChildren();
    if (who === 'bob' && !bobOnline) {
      const off = document.createElement('p'); off.className = 'phone-empty'; off.textContent = 'Celular desligado'; screen.append(off); continue;
    }
    const records = conversation.filter(r => who === 'alice' || r.delivered);
    if (!records.length) {
      const empty = document.createElement('p'); empty.className = 'phone-empty';
      empty.textContent = who === 'alice' ? chatOpen ? 'Escreva sua primeira mensagem.' : 'Selecione Bob para conversar.' : 'Nenhuma mensagem recebida.';
      screen.append(empty);
    }
    for (const r of records) {
      const bubble = document.createElement('div'); bubble.className = `phone-bubble ${who === 'alice' ? 'outgoing' : 'incoming'}`;
      bubble.textContent = r.text;
      const meta = document.createElement('small');
      meta.textContent = who === 'bob' ? 'Recebida' : r.delivered ? '✓✓ Entregue' : r.transported ? '✓ Enviada' : '◷ Enviando';
      bubble.append(meta); screen.append(bubble);
    }
    screen.scrollTop = screen.scrollHeight;
  }
  $('delivery-status').textContent = !bobOnline ? `${deliveryQueue.length} envelope(s) no HS_B · Bob offline` : busy ? 'Operações de cliente e rede em andamento' : established ? 'Bob online · entrega ao destinatário' : 'Aguardando a primeira mensagem';
}
function log(text, meta) {
  const item = document.createElement('div'); item.className = meta ? 'bubble' : 'system'; item.textContent = text;
  if (meta) { const note = document.createElement('small'); note.textContent = meta; item.append(note); }
  $('messages').append(item); $('messages').scrollTop = $('messages').scrollHeight;
}
async function renew(reason, run) {
  await stage(7, run);
  session++; index = 0; setups += Number($('members').value)-1;
  const period = 2 ** Number($('exponent').value);
  log(`${reason} → sessão ${session} · ${Number($('members').value)-1} canais msgX · ${session % period === 0 ? 'ECDH + novo segredo PQ' : 'ECDH; sem reinjeção PQ'}${session % period === period-1 ? ' · preparação PQ para a próxima fronteira' : ''}.`, null);
  render();
  if (bobOnline) await stage(8, run);
  deliver({type:'setup', session, index:0});
  if (!bobOnline) log('Setup protegido aguarda no HS_B até Bob reconectar.', null);
  render();
}
$('register-alice').onclick = async () => {
  if (registered || busy) return;
  const run = epoch; busy = true; registration = 'generating'; render();
  try {
    await delay(run);
    bundlesGenerated = true; registration = 'publishing'; render();
    await delay(run);
    registered = true; registration = 'done';
    log('Registro de Alice: bundles Γ e Σ gerados e assinados independentemente; os bundles públicos foram publicados no HS_A. Todas as chaves privadas permanecem no celular.', null);
  } catch(error) { if(error !== CANCELLED) throw error; }
  finally { if(run === epoch) { busy = false; render(); } }
};
$('bob-contact').onclick = () => { if (!registered || busy) return; chatOpen = true; render(); $('message').focus(); };
$('send-form').onsubmit = async e => {
  e.preventDefault(); const text = $('message').value.trim();
  if (!text || !registered || !chatOpen || busy) return;
  busy = true; const run = epoch;
  const record = {text, session, index:0, delivered:false, transported:false};
  conversation.push(record); $('message').value = ''; render();
  try {
    if (!established) {
      for (let i=1;i<=5;i++) await stage(i,run);
      established = true;
    }
    await stage(6,run);
    index++; published++; record.session = session; record.index = index; record.transported = true;
    $('payload').textContent = text;
    $('event').textContent = `evt_${session},${index} = AEAD(Σ.msgGX.M_${session},${index},\n  AEAD(Γ.msgGX.M_${session},${index}, msg))\n\nPublicações de Alice: 1 · destinatários: ${Number($('members').value)-1}`;
    deliver({type:'message',session,index,record});
    log(text, `Sessão ${session} · índice ${index} · ${bobOnline ? 'Bob decifra: Σ → Γ' : 'aguardando no HS_B'}`);
    render();
    if (index >= Number($('interval').value)) await renew('R atingido',run);
  } catch(error) { if (error !== CANCELLED) throw error; }
  finally { if (run === epoch) { busy = false; render(); } }
};
$('renew').onclick = async () => {
  if ($('renew').disabled) return;
  const run = epoch; busy = true; render();
  try { await renew('Timeout manual',run); }
  catch(error) { if(error !== CANCELLED) throw error; }
  finally { if(run === epoch) { busy = false; render(); } }
};
$('bob-power').onclick = async () => {
  if ($('bob-power').disabled) return;
  bobOnline = !bobOnline;
  if (!bobOnline) { log('Bob desligou o celular. Próximos envelopes aguardam no HS_B.',null); render(); return; }
  const run = epoch; busy = true; render();
  try {
    const count = deliveryQueue.length;
    while(deliveryQueue.length) {
      const event = deliveryQueue[0];
      await stage(event.type === 'setup' ? 8 : 6,run);
      receive(event); deliveryQueue.shift(); render();
    }
    log(`Bob reconectou · ${count} envelope(s) processado(s) em ordem.`,null);
  } catch(error) { if(error !== CANCELLED) throw error; }
  finally { if(run === epoch) { busy = false; render(); } }
};
$('timeline').onclick = e => {
  const target = e.target.closest('[data-inspect-step], [data-inspect-registration]');
  if (!target) return;
  const reg = target.dataset.inspectRegistration;
  if (reg) inspection = {step: -1, operation: -1, registration: reg};
  else {
    const value = Number(target.dataset.inspectStep);
    const operation = Number(target.dataset.inspectOperation || 0);
    if (!Number.isInteger(value) || value < 1 || !OPERATIONS[value] || !OPERATIONS[value][operation]) return;
    inspection = {step: value, operation};
  }
  const scroll = $('timeline').scrollTop;
  renderTimeline(); renderExplanation();
  $('timeline').scrollTop = scroll;
  const selector = reg ? `[data-inspect-registration="${reg}"]` : `[data-inspect-step="${inspection.step}"][data-inspect-operation="${inspection.operation}"]`;
  const selected = $('timeline').querySelector(selector);
  if (selected) selected.focus({preventScroll:true});
};
$('follow-execution').onclick = () => {
  inspection = null; renderTimeline(); renderExplanation();
  scrollToCurrentOperation();
};
$('owner').onchange = renderKeys;
$('reset').onclick = reset;
for(const id of ['interval','exponent','members']) $(id).onchange = reset;
$('legend').onclick = () => $('help').showModal();
$('close-help').onclick = () => $('help').close();
reset();
