import { Injectable } from '@nestjs/common';
import path from 'path';
import fs from 'fs';
import { execSync, spawn, exec} from 'child_process';
import { StateGraph, START, END, Annotation } from '@langchain/langgraph';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';
import { ChatBedrockConverse } from '@langchain/aws';
import git from 'isomorphic-git';
import http from 'isomorphic-git/http/node';
import { Octokit } from 'octokit';
import { CoverageService } from '../test_coverage/coverage.service';
import dotenv from 'dotenv';
dotenv.config();
const os = require('os');


const AgentState = Annotation.Root({
  reportPath: Annotation<string>(),
  coverageData: Annotation<any>(),
  analysis: Annotation<string>(),
  sbom: Annotation<string>(),
  remediationResult: Annotation<string>(),
});

export type ModelCreateInfo = {
  name: string,
  region?: string,
  temperature?: number,
  maxTokens?: number,
}

// Estensioni considerate file di testo analizzabili
const TEXT_EXTENSIONS = new Set([
  '.ts', '.js', '.tsx', '.jsx', '.py', '.java', '.kt', '.swift',
  '.go', '.rs', '.c', '.cpp', '.h', '.hpp', '.cs', '.php', '.rb',
  '.vue', '.svelte', '.html', '.css', '.scss', '.less',
  '.json', '.yaml', '.yml', '.toml', '.xml', '.env.example',
  '.md', '.txt', '.sh', '.bash', '.dockerfile', '.sql',
  '.graphql', '.proto',
]);

// Directory da ignorare durante la scansione
const IGNORED_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', 'out', 'coverage',
  '.next', '.nuxt', '.cache', 'vendor', '__pycache__', '.venv',
  'venv', 'env', 'reports', 'tmp', 'temp', '.idea', '.vscode',
]);

// Dimensione massima per singolo file (100KB)
const MAX_FILE_SIZE_BYTES = 100 * 1024;


@Injectable()
export class AgentService {
  constructor(
      private readonly coverageService: CoverageService
  ) {
    this.octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
  }

  async runSemgrepScan(repoPath: string): Promise<string | unknown> {
    const dateStr = new Date().toISOString().replace(/[:.]/g, '-');

    const reportPath = path.resolve(`./reports/` + repoPath +`/test_scan_${dateStr}.json`);
    const projectRoot = '/usr/src/repos/' + repoPath;

    console.log('Avvio test Semgrep...');

    const outputDir = path.dirname(reportPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
      console.log(`Creo la cartella: ${outputDir}`);
    }

    try {
      try {
        const version = execSync('semgrep --version').toString().trim();
        console.log(`Semgrep trovato: versione ${version}`);
      } catch (err) {
        console.error('Semgrep non sembra essere installato o nel PATH.');
        throw new Error('Semgrep non e stato trovato');
      }

      console.log(`Scansione in corso su: ${projectRoot}`);

      execSync(
          `semgrep scan ${projectRoot} --config auto --json --output ${reportPath} --exclude=node_modules --exclude=reports --exclude=dist --quiet --no-git-ignore`,
          {
            stdio: 'inherit',
            encoding: 'utf-8',
          },
      );
      console.log(`Scansione completata. File salvato in: ${reportPath}`);
      return reportPath;
    } catch (error: unknown) {
      console.error("Errore durante l'esecuzione di Semgrep:", error);
      return error;
    }
  }

  async analyzeRepoDocumentation(repoPath: string, model: ReturnType<AgentService['createModel']>): Promise<{
    report: string;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  }> {
    // Dimensione massima per batch inviato al modello (in byte)
    const BATCH_SIZE_BYTES = 7 * 1024 * 1024; // 7 MB

    const SYS_BATCH = `Sei un esperto di qualità del codice, documentazione e best practice.
Ricevi un sottoinsieme dei file di una repository. Per ogni file fornisci:
- Correttezza logica: bug, edge case non gestiti, logica errata
- Qualità del codice: leggibilità, naming, complessità
- Best practice: gestione errori, pattern architetturali, sicurezza di base
- Suggerimenti: massimo 3 miglioramenti prioritari per file
Se presente il README, valuta anche chiarezza, completezza e struttura della documentazione.
Sii conciso e diretto. Usa il percorso relativo del file come intestazione di sezione.`;

    const SYS_SYNTHESIS = `Sei un tech lead esperto. Ricevi i report parziali di analisi di una repository, suddivisi in batch.
Produci un unico report finale strutturato:
1. **Analisi del README** (se presente in uno dei batch)
2. **Analisi per file** — consolida e deduplicati i risultati per-file dei batch
3. **Problemi ricorrenti** — pattern trasversali a più file
4. **Valutazione complessiva** — voto da 1 a 10 con motivazione
5. **Top 5 azioni di miglioramento** per l'intera codebase`;

    console.log(`\n${'═'.repeat(60)}`);
    console.log(`[ANALISI REPO] Avvio scansione di: ${repoPath}`);
    console.log(`${'═'.repeat(60)}`);

    const allFiles = this.collectTextFiles(repoPath);
    console.log(`[ANALISI REPO] Trovati ${allFiles.length} file analizzabili`);

    type Section = { header: string; content: string; sizeBytes: number };
    const sections: Section[] = [];

    const readmePath = path.join(repoPath, 'README.md');
    if (fs.existsSync(readmePath)) {
      const raw = fs.readFileSync(readmePath, 'utf-8');
      const content = `### README.md\n\`\`\`markdown\n${raw}\n\`\`\``;
      sections.push({ header: 'README.md', content, sizeBytes: Buffer.byteLength(content, 'utf-8') });
      console.log(`[ANALISI REPO] README incluso`);
    } else {
      const content = `### README.md\n*(assente nella repository)*`;
      sections.push({ header: 'README.md', content, sizeBytes: Buffer.byteLength(content, 'utf-8') });
      console.log(`[ANALISI REPO] README non trovato`);
    }

    for (const filePath of allFiles) {
      const relativePath = path.relative(repoPath, filePath);
      if (relativePath === 'README.md') continue;
      const raw = fs.readFileSync(filePath, 'utf-8');
      const content = `### File: ${relativePath}\n\`\`\`\n${raw}\n\`\`\``;
      sections.push({ header: relativePath, content, sizeBytes: Buffer.byteLength(content, 'utf-8') });
    }

    const batches: Section[][] = [];
    let currentBatch: Section[] = [];
    let currentSize = 0;

    for (const section of sections) {
      if (currentSize + section.sizeBytes > BATCH_SIZE_BYTES && currentBatch.length > 0) {
        batches.push(currentBatch);
        currentBatch = [];
        currentSize = 0;
      }
      currentBatch.push(section);
      currentSize += section.sizeBytes;
    }
    if (currentBatch.length > 0) batches.push(currentBatch);

    console.log(`[ANALISI REPO] Suddiviso in ${batches.length} batch (limite ${BATCH_SIZE_BYTES / 1024 / 1024} MB ciascuno)`);

    batches.forEach((batch, i) => {
      const batchSizeKB = Math.round(batch.reduce((acc, s) => acc + s.sizeBytes, 0) / 1024);
      console.log(`[ANALISI REPO] Avvio batch ${i + 1}/${batches.length} — ${batch.length} file, ~${batchSizeKB} KB`);
    });

    const batchResults = await Promise.all(
        batches.map(async (batch, i) => {
          const payload = batch.map(s => s.content).join('\n\n');
          try {
            const response = await this.createModel({ name: 'deepseek.v3.2' }).invoke([
              new SystemMessage(SYS_BATCH),
              new HumanMessage(`Batch ${i + 1}/${batches.length} — file della repository:\n\n${payload}`),
            ]);

            const usage = (response as any).usage_metadata ?? {};
            const inputTok: number  = usage.input_tokens  ?? 0;
            const outputTok: number = usage.output_tokens ?? 0;

            console.log(`[ANALISI REPO] ✓ Batch ${i + 1}/${batches.length} completato — ` +
                `input: ${inputTok.toLocaleString('it-IT')} tok | output: ${outputTok.toLocaleString('it-IT')} tok`);

            return { report: response.content as string, inputTok, outputTok };
          } catch (err) {
            console.error(`[ANALISI REPO] Errore nel batch ${i + 1}:`, err);
            return { report: `*Errore durante l'analisi del batch ${i + 1}.*`, inputTok: 0, outputTok: 0 };
          }
        })
    );

    // Aggrega token e report mantenendo l'ordine dei batch
    let totalInputTokens  = 0;
    let totalOutputTokens = 0;
    const batchReports: string[] = [];
    for (const result of batchResults) {
      totalInputTokens  += result.inputTok;
      totalOutputTokens += result.outputTok;
      batchReports.push(result.report);
    }

    // ── Sintesi finale ────────────────────────────────────────────────────────
    let finalReport: string;

    if (batchReports.length === 1) {
      // Un solo batch: nessuna sintesi necessaria
      finalReport = batchReports[0];
    } else {
      console.log(`\n[ANALISI REPO] Avvio sintesi finale di ${batchReports.length} batch...`);

      const synthesisPayload = batchReports
          .map((r, idx) => `=== Batch ${idx + 1} ===\n${r}`)
          .join('\n\n');

      try {
        const synthesisResponse = await this.createModel({ name: 'deepseek.v3.2' }).invoke([
          new SystemMessage(SYS_SYNTHESIS),
          new HumanMessage(`Report parziali:\n\n${synthesisPayload}`),
        ]);

        const usage = (synthesisResponse as any).usage_metadata ?? {};
        const inputTok: number  = usage.input_tokens  ?? 0;
        const outputTok: number = usage.output_tokens ?? 0;
        totalInputTokens  += inputTok;
        totalOutputTokens += outputTok;

        console.log(`[ANALISI REPO] Sintesi completata — ` +
            `input: ${inputTok.toLocaleString('it-IT')} tok | output: ${outputTok.toLocaleString('it-IT')} tok`);

        finalReport = synthesisResponse.content as string;
      } catch (err) {
        console.error('[ANALISI REPO] Errore nella sintesi finale:', err);
        finalReport = batchReports.join('\n\n---\n\n');
      }
    }

    const totalTokens = totalInputTokens + totalOutputTokens;

    // ── Riepilogo token a terminale ───────────────────────────────────────────
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`[ANALISI REPO] ✅ Analisi completata`);
    console.log(`  File analizzati : ${allFiles.length}`);
    console.log(`  Batch eseguiti  : ${batches.length}`);
    console.log(`  Token input     : ${totalInputTokens.toLocaleString('it-IT')}`);
    console.log(`  Token output    : ${totalOutputTokens.toLocaleString('it-IT')}`);
    console.log(`  Token totali    : ${totalTokens.toLocaleString('it-IT')}`);
    console.log(`${'═'.repeat(60)}\n`);

    return { report: finalReport, inputTokens: totalInputTokens, outputTokens: totalOutputTokens, totalTokens };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Raccoglie ricorsivamente tutti i file di testo analizzabili nella repo
  // ─────────────────────────────────────────────────────────────────────────────
  private collectTextFiles(dirPath: string): string[] {
    const results: string[] = [];

    const walk = (current: string) => {
      let entries: fs.Dirent[];
      try {
        entries = fs.readdirSync(current, { withFileTypes: true });
      } catch {
        return;
      }

      for (const entry of entries) {
        if (IGNORED_DIRS.has(entry.name)) continue;

        const fullPath = path.join(current, entry.name);

        if (entry.isDirectory()) {
          walk(fullPath);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (!TEXT_EXTENSIONS.has(ext)) continue;

          try {
            const stat = fs.statSync(fullPath);
            if (stat.size > MAX_FILE_SIZE_BYTES) {
              console.log(`  [SKIP] File troppo grande (${Math.round(stat.size / 1024)}KB): ${fullPath}`);
              continue;
            }
            results.push(fullPath);
          } catch {
            // ignore
          }
        }
      }
    };

    walk(dirPath);
    return results;
  }



  // ─────────────────────────────────────────────────────────────────────────────
  // Workflow principale
  // ─────────────────────────────────────────────────────────────────────────────
  async execute(repoLink: string) {
    const fullRepoPath = await this.cloneRepo(repoLink);
    const repoName = path.basename(fullRepoPath);
    const repoOwner = repoLink.split('/').at(-2)!;

    const model = this.createModel({ name: 'deepseek.v3.2' });

    const workflow = new StateGraph(AgentState)
        .addNode('run_scan', async () => {
          const pathGenerated = await this.runSemgrepScan(repoName);
          return { reportPath: pathGenerated };
        })
        .addNode('run_coverage', async () => {
          console.log(`Avvio scansione Test Coverage in: ${fullRepoPath}`);
          try {
            const coverage = await this.coverageService.runTestsAndUpload(fullRepoPath);
            return { coverageData: coverage };
          } catch (err) {
            console.error("Fallimento coverage, procedo comunque...");
            return { coverageData: { error: "Non disponibile o fallito" } };
          }
        })
        .addNode('remediation', async(state: typeof AgentState.State) => {
          try{
            if (!state.reportPath || !fs.existsSync(state.reportPath)) {
              return { remediationResult: "Nessun report di sicurezza disponibile per generare remediation." };
            }
            const rawData = fs.readFileSync(state.reportPath, 'utf-8');
            const jsonReport = JSON.parse(rawData);

            const firstResult = jsonReport.results[0];

            const filePath = firstResult.path;
            console.log(`Inizio Remediation su : ${filePath}`);
            const fileContent = fs.readFileSync(filePath);

            if (!jsonReport.results || jsonReport.results.length === 0) {
              return { remediationResult: "Nessuna vulnerabilità critica trovata da Semgrep." };
            }

            const response = await model.invoke([
              new SystemMessage(`Sei un esperto di remediation. Analizza il seguente JSON di Semgrep. 
            Per ogni vulnerabilità trovata, il codice codice 'BEFORE' (vulnerabile) e 'AFTER' (sicuro). Assicurati per ogni vulnerabilita' di spiegare il problema in un massimo di 25 parole.`),
              new HumanMessage(
                  `Dati Semgrep: \n${JSON.stringify(firstResult)}\n\n 
                        File da correggere: \n${fileContent}`
              ),
            ]);

            return { remediationResult: response.content as string };

          } catch (err) {
            console.log('Fallimento remediation', err);
            return { remediationResult: "Errore durante la generazione della remediation." };
          }
        })
        .addNode('ai_analysis', async (state) => {
          const semgrepRaw = fs.readFileSync(state.reportPath as string, 'utf-8');
          const coverageContext = JSON.stringify(state.coverageData, null, 2);
          const response = await model.invoke([
            new SystemMessage(
                `Sei un esperto di sicurezza e qualità del codice. 
                        Analizza il report Semgrep (sicurezza) e i dati di Test Coverage (qualità).
                        Crea un report discorsivo che metta in relazione i due aspetti.
                        Aggiungi infine la  remediation che hai ricevuto, senza fare commenti a riguargo.`
            ),
            new HumanMessage(
                `Dati Semgrep: \n${semgrepRaw}\n\n 
                        Dati Coverage: \n${coverageContext}
                            Dati Remediation: \n${state.remediationResult}`
            ),
          ]);
          console.log(response)
          return { analysis: response.content as string };
        })

        // Nodo README + analisi completa dei file in un'unica chiamata
        .addNode('readme_analysis', async (state: typeof AgentState.State) => {
          const { report, inputTokens, outputTokens, totalTokens } =
              await this.analyzeRepoDocumentation(fullRepoPath, model);

          const tokenSummary = [
            '',
            '---',
            '## 📊 Token utilizzati per l\'analisi della documentazione',
            '',
            `| Metrica         | Valore                            |`,
            `|-----------------|-----------------------------------|`,
            `| Token in input  | ${inputTokens.toLocaleString('it-IT').padStart(33)} |`,
            `| Token in output | ${outputTokens.toLocaleString('it-IT').padStart(33)} |`,
            `| **Totale**      | **${totalTokens.toLocaleString('it-IT').padStart(30)}** |`,
            '',
            `> Modello: \`${(model as any).model ?? 'deepseek.v3.2'}\` — repository \`${repoName}\``,
          ].join('\n');

          return { analysis: state.analysis + '\n\n' + report + tokenSummary };
        })

        .addNode('get_languages', async (state) => {
          const languages = await this.fetchLanguages({ owner: repoOwner, repo: repoName });

          const stringified = languages
              .map((value: (string | number | undefined)[]) => `${value[0]}: ${value[1]}`)
              .reduce((prev: string, curr: string) => `${prev}\n${curr}`);

          const response = `**Linguaggi:**\n${stringified}`;
          console.log(response);

          return { analysis: `${state.analysis + response}` };
        })

        .addNode('dependencies', async (state) => {
          console.log(`Analisi dipendenze della repo ${repoName} in corso...`);
          try {
            const dep = execSync(`syft dir:${fullRepoPath} -o json -q`).toString().trim();
            const syftJson = JSON.parse(dep);

            const artifacts = syftJson.artifacts?.map((a: any) => ({
              name: a.name,
              version: a.version,
              type: a.type,
              language: a.language ?? null,
              licenses: a.licenses?.map((l: any) => l.value ?? l) ?? [],
            })) ?? [];

            const limited = artifacts.slice(0, 300);
            const summary = JSON.stringify(limited, null, 2);

            const response = await model.invoke([
              new SystemMessage(
                  `Restituisci un report sintetico relativo alle dipendenze e librerire trovate da Syft, prova a capire che framework vengono utilizzati..`
              ),
              new HumanMessage(
                  `Dati Syft (${artifacts.length} dipendenze totali, mostrate le prime ${limited.length}): \n${summary}`
              ),
            ]);

            console.log(response);
            return { analysis: `${state.analysis + response.content}` };
          } catch (error) {
            console.error(`Errore durante l'analisi Syft:`, error);
            throw new Error(`Impossibile analizzare la repository: ${error}`);
          }
        })

        .addEdge(START, 'run_scan')
        .addEdge('run_scan', 'run_coverage')
        .addEdge('run_coverage', 'remediation')
        .addEdge('remediation', 'ai_analysis')
        .addEdge('ai_analysis', 'readme_analysis')
        .addEdge('readme_analysis', 'get_languages')
        .addEdge('get_languages', 'dependencies')
        .addEdge('dependencies', END)

    const app = workflow.compile();
    return (await app.invoke({})).analysis;
  }

  async cloneRepo(url: string): Promise<string> {
    console.log(`Ricevuto: ${url}`);

    const repoName = url.split('/').pop()!.replace(/\.git$/, '');
    const clonePath = path.join('/usr/src/repos', repoName);

    console.log(`Esecuzione git clone in ${clonePath}`);

    if (fs.existsSync(clonePath)) {
      console.log('Repo già presente localmente.');
      return clonePath;
    }

    await git.clone({
      http,
      fs,
      dir: clonePath,
      url,
      singleBranch: true,
      depth: 1,
    });

    console.log(`Repo clonata con successo in ${clonePath}`);
    return clonePath;
  }

  private createModel(modelCI: ModelCreateInfo) {
    console.log(`Creazione llm: ${modelCI.name}`);

    return new ChatBedrockConverse({
      model: modelCI.name,
      region: process.env.BEDROCK_AWS_REGION || modelCI.region || 'eu-north-1',
      temperature: modelCI.temperature || 0,
      maxTokens: modelCI.maxTokens || 5000,
    });
  }

  async authTest() {
    const { data: { login } } = await this.octokit.rest.users.getAuthenticated();
    return login;
  }

  async fetchLanguages({ owner, repo }: { owner: string, repo: string }) {
    console.log(`Owner: ${owner}`);
    console.log(`Repo: ${repo}`);
    const languages = await this.octokit.rest.repos.listLanguages({ repo, owner });
    console.log(languages);

    const total = Object.values(languages.data).reduce((prev, curr) => curr + prev);
    console.log(`Total ${total}`);

    const result = Object.entries(languages.data).map((langInfo: [string, number]) => {
      return [langInfo.at(0), langInfo.at(1) as number / total * 100];
    })

    return result;
  }

  private readonly octokit: Octokit;
}
