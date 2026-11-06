# Compatibilidade de Vagas

Extensão do Chrome que lê os requisitos de uma vaga, mede a compatibilidade com o perfil do candidato por regras transparentes e gera um currículo sob medida, em português ou inglês, em PDF e Word, **só com o que o perfil comprova**.

- Sem IA no cálculo, sem internet e sem servidor: tudo roda no navegador.
- Motor por regras (rule-based) e orientado a dados (data-driven): o conhecimento fica num dicionário em JSON (1.459 termos, 84 habilidades, 10 áreas).
- Princípio do projeto: o currículo não pode ter mentira, exagero nem abismo entre o que diz e o que o candidato sabe fazer.

> Código desenvolvido com assistência de IA (Claude). Eu defini o problema, as regras de negócio e os critérios de teste, conferi os resultados e aprovei cada versão.

## O que a extensão faz

1. Você seleciona o texto da vaga na própria página e clica com o botão direito em **Analisar compatibilidade com meu perfil**.
2. O painel lateral mostra o percentual (match score), o que o perfil comprova, o que falta (gap analysis) e o motivo de cada item.
3. Se decidir se candidatar, você gera o currículo, edita na página e salva em PDF ou Word.

Regras principais:

- Toda habilidade precisa de evidência (experiência, projeto, curso ou documento).
- Código escrito por IA em projeto próprio não comprova que o candidato programa.
- Curso em andamento recebe crédito parcial só em vagas de entrada.
- Cursos correlatos só contam quando a vaga aceita "áreas correlatas".
- Se a vaga foi mal lida (poucas linhas reconhecidas), o percentual é marcado como não confiável.

## Instalação

1. Baixe ou clone este repositório.
2. No Chrome, abra `chrome://extensions`, ligue o **Modo do desenvolvedor** e clique em **Carregar sem compactação**.
3. Escolha a pasta `extensao`.
4. Na página de opções da extensão, carregue um perfil. Para testar, use `perfil_exemplo.json`.

## Seu próprio perfil

O perfil é um arquivo JSON validado pelo esquema `perfil_schema.json`. Use `perfil_exemplo.json` como modelo. **Não publique o seu perfil real**: ele tem dados pessoais.

## Estrutura

| Pasta ou arquivo | Conteúdo |
|---|---|
| `extensao/` | Extensão Chrome (Manifest V3): motor em JavaScript, painel lateral, gerador de currículo |
| `motor_referencia.py` | Motor de referência em Python, usado para projetar e testar as regras |
| `dicionario_sinonimos.json` | Dicionário de termos, regras de contexto e pesos (cópia idêntica em `extensao/dicionario.json`) |
| `perfil_schema.json` | Esquema do perfil (JSON Schema) |
| `perfil_exemplo.json` | Perfil fictício de exemplo |
| `testes/` | Testes de regressão, de empacotamento e de honestidade do currículo |

## Testes

Requisitos: Python 3 (com `jsonschema`) e Node.js.

```bash
python3 testes/rodar_testes.py        # motor em Python: regressão e perfis quebrados de propósito
node testes/rodar_testes_js.js        # motor em JavaScript: mesmos casos e teste de empacotamento
node testes/testar_curriculo.js       # honestidade do currículo em português e inglês
```

Os resultados esperados ficam em `testes/casos.json`. Depois de uma mudança revisada no motor ou no dicionário, gere de novo com `python3 testes/gerar_esperados.py`.

As vagas de teste são textos escritos para os testes, sem dados de empresas reais.

## Licenças

- Este projeto: [MIT](LICENSE).
- Biblioteca [docx](https://github.com/dolanmiu/docx) (`extensao/docx.iife.js`): MIT.
- Fonte [JetBrains Mono](https://github.com/JetBrains/JetBrainsMono) (`extensao/fontes/`): SIL Open Font License 1.1 (`extensao/fontes/LICENSE-JetBrainsMono-OFL.txt`).

## Limitações conhecidas

- Os pesos (obrigatório 3, atividade 2, desejável 1) e o crédito parcial são convenções declaradas, não calibrações estatísticas.
- O dicionário é finito: termos ausentes não são reconhecidos.
- Leitura de print de tela (OCR) não implementada.
- Até agora, o uso real é de um único usuário.
