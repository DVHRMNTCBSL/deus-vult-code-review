# Deus Vult Code Review

Recorte de codigo para revisao tecnica do Marcos.

Este repositorio contem codigo real em camadas:

- `frontend-vitrine/`: HTML, CSS e JavaScript da vitrine publica Deus Vult.
- `calculadora-web/`: HTML, CSS e JavaScript da Calculadora Tributaria One.
- `calculadora-android/`: Android/Java com WebView local e assets embarcados.
- `python/`: pacote Python `deus_vult_python` e testes.

## Dados

Resumo do pacote:

- 40 arquivos de codigo/artefatos revisaveis antes dos metadados finais.
- 37 arquivos textuais.
- 7.034 linhas textuais.
- Scan de seguranca sem segredo real identificado.
- Testes Python: 6 tests OK.

Consulte:

- `LEIA_PRIMEIRO_MARCOS.md`
- `MANIFEST_DADOS.csv`
- `RESUMO_DADOS.json`
- `SCAN_SEGURANCA.txt`

## Como abrir

Frontend:

```text
frontend-vitrine/index.html
calculadora-web/index.html
```

Python:

```powershell
$env:PYTHONPATH = "$PWD\python"
python -m unittest discover -s python/tests
```

Android:

```text
Abrir calculadora-android/ no Android Studio.
```

## Limite honesto

Isto e um recorte revisavel de codigo, nao o workspace privado completo.

Ficaram fora logs, auditorias internas, e-mails, configs locais, arquivos de terceiros, scripts de deploy/pagamento/publicacao e qualquer segredo ou dado pessoal.

## Licenca

Licenca formal ainda pendente. Ate a decisao de licenca, trate como codigo compartilhado para revisao tecnica privada.
