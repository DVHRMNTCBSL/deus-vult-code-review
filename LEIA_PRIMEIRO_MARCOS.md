# Marcos, agora e codigo mesmo

Voce estava certo em cobrar: open source sem codigo nao e open source.

Este pacote expandido nao e so README. Ele contem codigo real para voce abrir, ler, rodar parcialmente e criticar.

## O que tem aqui

### `frontend-vitrine/`

HTML, CSS e JavaScript da vitrine publica Deus Vult.

- `index.html`
- `mente.css`
- `mente.js`
- `a11y-sem-luz.js`
- `j10-dissert-core.js`
- `subobras.js`
- `apoio.js`
- `loop-dv.js`
- `open-source/`
- `assets/`

Como olhar: abrir `frontend-vitrine/index.html` no navegador.

### `calculadora-web/`

Codigo publico da Calculadora Tributaria One em HTML, CSS e JS.

- `index.html`
- `styles.css`
- `app.js`
- `one-core.js`
- `one-ui.js`

Como olhar: abrir `calculadora-web/index.html`.

### `calculadora-android/`

Codigo Android com Java real.

- `app/src/main/java/com/deusvult/calculadoraone/MainActivity.java`
- `AndroidManifest.xml`
- `build.gradle`
- assets web embarcados em `app/src/main/assets/www/`

Como olhar: abrir a pasta `calculadora-android/` no Android Studio.

### `python/`

Nucleo Python do protocolo DV.

- `deus_vult_python/core.py`
- `deus_vult_python/cli.py`
- `deus_vult_python/__main__.py`
- `tests/test_deus_vult_python.py`

Como testar:

```powershell
python -m unittest discover -s python/tests
```

## O que ficou fora

Ficaram fora:

- logs;
- auditorias internas;
- e-mails;
- configs locais;
- dados pessoais;
- arquivos de cliente/testador;
- scripts de deploy, pagamento e publicacao;
- qualquer token, senha, chave, `.env` ou segredo.

Eu confio em voce, mas confiar nao significa despejar coisa sensivel ou ruido. Este pacote e para revisar codigo, arquitetura e clareza.

## Dados auditaveis

Veja:

- `MANIFEST_DADOS.csv`: arquivo, tamanho, linhas e SHA256.
- `RESUMO_DADOS.json`: resumo quantitativo.
- `SCAN_SEGURANCA.txt`: varredura de termos sensiveis e observacao.

## O que eu queria que voce criticasse

1. O que esse codigo realmente faz?
2. O que esta confuso?
3. O que parece promessa maior que entrega?
4. O que deveria virar repositorio publico primeiro?
5. O que voce refatoraria antes de chamar isso de open source serio?
6. Falta licenca, CI, README tecnico, testes ou arquitetura?

Pode meter o dedo. Eu estou te mandando isso porque eu realmente queria que voce entendesse e pudesse avaliar com dados.
