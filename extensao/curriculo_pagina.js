'use strict';
let cv = null;

function nomeArquivo(ext) {
  const limpa = s => s.normalize('NFD').replace(/\p{Mn}/gu, '').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, ' ');
  return `${cv.idioma === 'en' ? 'Resume' : 'Curriculo'} - ${limpa(cv.nome)}` + (cv.objetivo ? ` - ${limpa(cv.objetivo).slice(0, 60)}` : '') + '.' + ext;
}

async function iniciar() {
  const { curriculo } = await chrome.storage.session.get('curriculo');
  const area = document.getElementById('cv');
  if (!curriculo) { area.textContent = 'Nenhum currículo para mostrar. Analise uma vaga no painel e clique em "Gerar currículo".'; return; }
  cv = curriculo;
  area.innerHTML = Curriculo.html(cv); // html() escapa todo o conteúdo
  area.lang = cv.idioma === 'en' ? 'en' : 'pt-BR';
  document.title = nomeArquivo('pdf').replace(/\.pdf$/, '');
}

document.getElementById('pdf').addEventListener('click', () => window.print());
document.getElementById('word').addEventListener('click', async () => {
  if (!cv) return;
  const blob = await docx.Packer.toBlob(Curriculo.docxDoDom(document.getElementById('cv'), docx));
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = nomeArquivo('docx');
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
});
iniciar();
