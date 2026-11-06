'use strict';
const $ = id => document.getElementById(id);
let motor = null, perfil = null, dicionario = null, ultimo = null;

const ROTULO_TIPO = { obrigatorio: 'obrigatório', desejavel: 'desejável', atividade: 'atividade', sem_secao: 'geral' };
const GRUPOS = [
  ['nao', 'não atende', '×'],
  ['parcial', 'em formação, crédito parcial', '½'],
  ['verificar', 'verificar', '?'],
  ['sim', 'atende', '✓']
];

async function iniciar() {
  const D = await (await fetch(chrome.runtime.getURL('dicionario.json'))).json();
  dicionario = D; motor = Motor.criar(D);
  const { perfil: p } = await chrome.storage.local.get('perfil');
  perfil = p || null;
  $('sem-perfil').hidden = !!perfil;
  const { vagaPendente } = await chrome.storage.session.get('vagaPendente');
  if (vagaPendente) receberVaga(vagaPendente);
}

function receberVaga(v) {
  if (!v || !v.texto) return;
  $('vaga').value = v.texto;
  chrome.storage.session.remove('vagaPendente');
  analisar();
}

function analisar() {
  $('erro').hidden = true;
  const texto = $('vaga').value.trim();
  if (!texto) return;
  if (!perfil) { $('sem-perfil').hidden = false; return; }
  $('cargo').value = Curriculo.tituloDaVaga(texto) || '';
  $('nivel').value = 'auto';
  calcular(texto);
}
// Refaz a conta com o nível declarado e o cargo, sem mexer no que o usuário digitou.
function calcular(texto) {
  let r;
  const nivel = $('nivel').value;
  try { r = motor.comparar(perfil, texto, { senioridade: nivel === 'auto' ? null : nivel, cargo: $('cargo').value }); }
  catch (e) { mostrarErro(e.message); return; }
  if (!r.itens.length) { mostrarErro('Nenhum requisito reconhecido nesse texto. Selecione a parte de requisitos/atividades da vaga.'); $('resultado').hidden = true; return; }
  ultimo = { r, texto };
  desenhar(r);
}

const NOMES_ESC = { fundamental: 'ensino fundamental', medio: 'ensino médio', tecnico: 'técnico', tecnico_ou_superior: 'técnico ou superior', superior_cursando: 'superior (cursando ou completo)', superior_completo: 'superior completo', pos: 'pós-graduação', mestrado: 'mestrado', doutorado: 'doutorado' };
function nomeItem(n) {
  return n.replace(/^Escolaridade: ([a-z_]+)/, (m, k) => 'Escolaridade: ' + (NOMES_ESC[k] || k))
    .replace(/ em nao_reconhecido$/, ' (curso não reconhecido)').replace(/_/g, ' ');
}
// Troca os códigos internos de evidência pelos nomes do perfil (ex.: proj_rota -> Rota).
function legivel(motivo) {
  if (!perfil || !motivo.startsWith('evidência: ')) return motivo;
  const nomes = { documento: 'documento', declaracao_nivel: 'nível declarado' };
  for (const x of perfil.experiencias) nomes[x.id] = x.empresa;
  for (const x of perfil.projetos) nomes[x.id] = x.nome.split(':')[0];
  for (const x of perfil.cursos) nomes[x.id] = x.nome;
  return 'evidência: ' + motivo.slice(11).split(', ').map(i => nomes[i] || i).join(', ');
}

function mostrarErro(msg) { $('erro').textContent = msg; $('erro').hidden = false; }

function el(tag, cls, texto) { const e = document.createElement(tag); if (cls) e.className = cls; if (texto != null) e.textContent = texto; return e; }

function desenhar(r) {
  const pct = r.percentual == null ? '–' : r.percentual + '%';
  $('pct').textContent = pct;
  const n = Math.round((r.percentual || 0) / 5), tr = $('trilho'); tr.replaceChildren();
  tr.append('[', el('span', 'cheio', '█'.repeat(n)), '░'.repeat(20 - n), ']');
  const nVer = r.itens.filter(i => i[3] === 'verificar').length;
  $('resumo').textContent = r.obrigatorios_faltando
    ? `${r.obrigatorios_faltando} obrigatório${r.obrigatorios_faltando > 1 ? 's' : ''} não atendido${r.obrigatorios_faltando > 1 ? 's' : ''}`
    : 'todos os obrigatórios atendidos';
  const NIVEL = { entrada: 'entrada', acima: 'pleno ou sênior', indefinida: 'não identificado' };
  const ORIGEM = { declarada: ' (declarado por você)', cargo: ' (pelo cargo)', texto: '' };
  const ch = $('chaves'); ch.replaceChildren();
  for (const [k, v] of [['requisitos', String(r.itens.length)], ['leitura', `${r.cobertura.reconhecidas} de ${r.cobertura.linhas} linhas`], ['nível da vaga', NIVEL[r.senioridade] + (ORIGEM[r.senioridade_origem] || '')], ...(nVer ? [['para verificar', `${nVer}, fora da conta`]] : [])]) ch.append(el('dt', null, k), el('dd', null, v));
  const cb = r.cobertura, al = $('alerta-cobertura'); al.replaceChildren();
  $('pct').style.opacity = cb.confianca === 'baixa' ? '0.35' : '1';
  $('trilho').classList.toggle('apagado', cb.confianca === 'baixa');
  if (cb.confianca === 'baixa') $('resumo').textContent = 'não dá para avaliar: a maior parte da vaga não foi reconhecida';
  if (cb.confianca !== 'alta') {
    al.className = cb.confianca === 'baixa' ? 'erro' : 'aviso'; al.style.marginTop = '8px';
    al.append(el('b', null, cb.confianca === 'baixa'
      ? `Resultado NÃO confiável: só ${cb.reconhecidas} de ${cb.linhas} linhas de requisito foram reconhecidas. Leia a vaga inteira antes de decidir.`
      : `Atenção: ${cb.linhas - cb.reconhecidas} de ${cb.linhas} linhas de requisito não foram reconhecidas.`));
    const d = el('details'); d.append(el('summary', null, 'Ver linhas não reconhecidas'));
    const ul = el('ul'); cb.nao_reconhecidas.forEach(l => ul.append(el('li', null, l.replace(/^\s*([-•*▪●◦·]|\d+[.)])\s*/, '')))); d.append(ul); al.append(d);
    al.hidden = false;
  } else al.hidden = true;
  const grupos = $('grupos'); grupos.replaceChildren();
  for (const [st, titulo, simbolo] of GRUPOS) {
    const lista = r.itens.filter(i => i[3] === st).sort((a, b) => b[1] - a[1]);
    if (!lista.length) continue;
    grupos.append(el('h2', null, `${titulo} (${lista.length})`));
    const card = el('div', 'cartao'); const ul = el('ul', 'itens');
    for (const [nome, peso, tipo, , motivo] of lista) {
      const li = el('li', st);
      li.append(el('span', 'selo', simbolo));
      const corpo = el('div');
      const linha = el('div'); linha.append(el('span', 'nome', nomeItem(nome)));
      linha.append(el('span', 'tag ' + tipo, ROTULO_TIPO[tipo] || tipo));
      corpo.append(linha, el('div', 'meta', `${legivel(motivo)} (peso ${peso})`));
      li.append(corpo); ul.append(li);
    }
    card.append(ul); grupos.append(card);
  }
  $('resultado').hidden = false;
}

$('analisar').addEventListener('click', analisar);
async function gerar(idioma) {
  if (!ultimo || !perfil) return;
  const cv = Curriculo.montar(perfil, ultimo.r, ultimo.texto, dicionario, { cargo: $('cargo').value, idioma });
  await chrome.storage.session.set({ curriculo: cv });
  chrome.tabs.create({ url: chrome.runtime.getURL('curriculo.html') });
}
$('gerar').addEventListener('click', () => gerar('pt'));
$('nivel').addEventListener('change', () => { if (ultimo) calcular(ultimo.texto); });
$('cargo').addEventListener('change', () => { if (ultimo && $('nivel').value === 'auto') calcular(ultimo.texto); });
$('gerar-en').addEventListener('click', () => gerar('en'));
$('limpar').addEventListener('click', () => { $('vaga').value = ''; $('resultado').hidden = true; $('erro').hidden = true; });
$('perfil').addEventListener('click', () => chrome.runtime.openOptionsPage());
$('abrir-opcoes').addEventListener('click', e => { e.preventDefault(); chrome.runtime.openOptionsPage(); });
$('vaga').addEventListener('keydown', e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) analisar(); });
chrome.storage.onChanged.addListener((mud, area) => {
  if (area === 'session' && mud.vagaPendente && mud.vagaPendente.newValue) receberVaga(mud.vagaPendente.newValue);
  if (area === 'local' && mud.perfil) { perfil = mud.perfil.newValue || null; $('sem-perfil').hidden = !!perfil; if ($('vaga').value.trim()) analisar(); }
});
iniciar();
