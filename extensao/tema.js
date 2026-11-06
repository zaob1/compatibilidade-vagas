// Tema da interface: automático (segue o Chrome/Windows), claro ou escuro. Salvo neste navegador.
(function () {
  const raiz = document.documentElement;
  const ler = () => { try { return localStorage.getItem('tema') || 'auto'; } catch (e) { return 'auto'; } };
  const aplicar = t => { raiz.dataset.tema = t; document.querySelectorAll('.tema button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.valor === t))); };
  aplicar(ler());
  document.addEventListener('DOMContentLoaded', () => {
    aplicar(ler());
    document.querySelectorAll('.tema button').forEach(b => b.addEventListener('click', () => {
      try { localStorage.setItem('tema', b.dataset.valor); } catch (e) {}
      aplicar(b.dataset.valor);
    }));
  });
  window.addEventListener('storage', e => { if (e.key === 'tema') aplicar(ler()); });
})();
