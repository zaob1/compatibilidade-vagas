'use strict';
const $ = id => document.getElementById(id);
let motor = null, dicionario = null;

function el(tag, cls, texto) { const e = document.createElement(tag); if (cls) e.className = cls; if (texto != null) e.textContent = texto; return e; }

async function iniciar() {
  const D = await (await fetch(chrome.runtime.getURL('dicionario.json'))).json();
  dicionario = D; motor = Motor.criar(D);
  mostrarAtual();
}

async function mostrarAtual() {
  const { perfil } = await chrome.storage.local.get('perfil');
  const box = $('atual'); box.replaceChildren();
  if (!perfil) { box.hidden = true; return; }
  box.append(el('div', 'nome', perfil.dados_pessoais.nome));
  const dl = el('dl', 'chaves');
  for (const [k, v] of [['experiências', perfil.experiencias.length], ['projetos', perfil.projetos.length], ['cursos', perfil.cursos.length], ['formação', perfil.formacoes.length]]) dl.append(el('dt', null, k), el('dd', null, String(v)));
  box.append(el('div', 'prompt', '>>> perfil salvo'), dl);
  box.hidden = false;
}

function mensagens(erros, avisos, sucesso) {
  const m = $('mensagens'); m.replaceChildren();
  if (sucesso) m.append(el('div', 'ok', sucesso));
  if (erros.length) { const d = el('div', 'erro'); d.append(el('b', null, `Perfil inválido (${erros.length} erro(s)) — nada foi salvo:`)); const ul = el('ul'); erros.forEach(e => ul.append(el('li', null, e))); d.append(ul); m.append(d); }
  if (avisos.length) { const d = el('div', 'aviso'); d.style.marginTop = '8px'; d.append(el('b', null, 'Avisos:')); const ul = el('ul'); avisos.forEach(e => ul.append(el('li', null, e))); d.append(ul); m.append(d); }
}

$('arquivo').addEventListener('change', async e => {
  const f = e.target.files[0]; if (!f) return;
  $('nome-arquivo').textContent = f.name;
  $('texto').value = await f.text();
});

$('salvar').addEventListener('click', async () => {
  let P;
  try { P = JSON.parse($('texto').value); }
  catch (e) { mensagens(['O texto não é um JSON válido: ' + e.message], []); return; }
  const [erros, avisos] = motor.validarPerfil(P);
  const amigavel = t => {
    const nomes = {};
    for (const x of [...(P.experiencias || []), ...(P.projetos || []), ...(P.cursos || [])]) nomes[x.id] = (x.nome || x.empresa || x.id).split(':')[0];
    for (const a of Object.values(dicionario.areas)) for (const [h, hb] of Object.entries(a.habilidades)) nomes[h] = hb.nome;
    return t.replace(/\b[a-z][a-z0-9_]*\b/g, m => nomes[m] ? `"${nomes[m]}"` : m);
  };
  if (erros.length) { mensagens(erros.map(amigavel), avisos.map(amigavel)); return; }
  await chrome.storage.local.set({ perfil: P });
  mensagens([], avisos.map(amigavel), 'Perfil salvo. Já pode analisar vagas pelo painel lateral.');
  mostrarAtual();
});

$('remover').addEventListener('click', async () => {
  await chrome.storage.local.remove('perfil');
  mensagens([], [], 'Perfil removido deste navegador.');
  mostrarAtual();
});

iniciar();
