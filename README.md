# Code Guardian

**Piattaforma ad agenti intelligenti per l'audit e la remediation automatizzata di repository software.**

Code Guardian automatizza il miglioramento della qualità del codice analizzando repository GitHub per valutarne sicurezza, testabilità e documentazione, fornendo suggerimenti concreti per risolvere le vulnerabilità individuate.

## Architettura del Sistema

Il progetto si basa su un'architettura multi-agente coordinata da un orchestratore centrale:

- **`orchestrator`**: Il nucleo centrale che coordina il flusso di lavoro tra i vari agenti.
- **`test-agent`**: Analizza la copertura e la qualità dei test unitari rispetto agli standard minimi (coverage richiesto: 70%).
- **`security-agent`**: Esegue audit completi basati sullo standard **OWASP Top 10** (es. SQL Injection, XSS).
- **`doc-agent`**: Verifica la presenza e la qualità di README, documentazione API e guide.
- **`remediation-engine`**: Genera proposte concrete di miglioramento, come la parametrizzazione di query vulnerabili.

## Requisiti Tecnici

Per l'esecuzione e lo sviluppo della piattaforma sono necessari i seguenti strumenti:

- **Runtime**: Node.js (Backend)
- **Frontend**: React.js
- **Database**: PostgreSQL o MongoDB
- **Cloud/CI**: Account AWS e GitHub Actions per l'integrazione continua

---

## Guide all'Avvio

### Configurazione Ambiente
1. Clonare il repository.
2. ...