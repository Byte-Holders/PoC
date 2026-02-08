import { Injectable } from '@nestjs/common';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';
import { StateGraph, START, END, Annotation } from '@langchain/langgraph';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';
import { ChatBedrockConverse } from '@langchain/aws';
import git from 'isomorphic-git';
// import per isomorphic-git (clone)
import http from 'isomorphic-git/http/node';
// import fs from 'fs'; (sopra)
import { CoverageService } from '../test_coverage/coverage.service';

import dotenv from 'dotenv';

dotenv.config();

const AgentState = Annotation.Root({
    reportPath: Annotation<string | unknown>(),
    coverageData: Annotation<any>(),
    analysis: Annotation<string>(),
});

export type ModelCreateInfo = {
    name: string,
    region?: string,
    temperature?: number,
    maxTokens?: number,
}

@Injectable()
export class AgentService {
    constructor(
        private readonly coverageService: CoverageService 
    ) {}

    async runSemgrepScan(repoPath: string): Promise<string | unknown> {
        const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
        const reportPath = path.resolve(`./reports/test_scan_${dateStr}.json`);

        console.log('Avvio test Semgrep...');

        //Se non esiste la cartella report la crea
        const outputDir = path.dirname(reportPath);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
            console.log(`Creo la cartella: ${outputDir}`);
        }

        try {
            // Se non trova semgrep non avvia il comando
            try {
                const version = execSync('semgrep --version').toString().trim();
                console.log(`Semgrep trovato: versione ${version}`);
            } catch (err) {
                console.error('Semgrep non sembra essere installato o nel PATH.');
                throw new Error('Semgrep non e stato trovato');
            }

            //Avvia la scansione su projectRoot che pero si cambia easy se serve fare la scansione su qualcosa di diverso.
            const projectRoot = '/usr/src/repos/' + repoPath;
            console.log(`Scansione in corso su: ${projectRoot}`);

            execSync(
                `semgrep scan ${projectRoot} --config auto --json --output ${reportPath} --exclude=node_modules --exclude=reports --exclude=dist --quiet`,
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

    // workflow

    async execute(repoLink: string) {
        // 1. Aspetta il clone e ottieni il path pulito
        const fullRepoPath = await this.cloneRepo(repoLink);
        const repoName = path.basename(fullRepoPath);

        const model = this.createModel({ name: 'qwen.qwen3-coder-30b-a3b-v1:0' });
        
        const workflow = new StateGraph(AgentState)
            .addNode('run_scan', async () => {
                // Usa il repoName senza .git
                const pathGenerated = await this.runSemgrepScan(repoName);
                return { reportPath: pathGenerated };
            })
            .addNode('run_coverage', async () => {
                console.log(`Avvio scansione Test Coverage in: ${fullRepoPath}`);
                try {
                    // Passa il path assoluto pulito
                    const coverage = await this.coverageService.runTestsAndUpload(fullRepoPath);
                    return { coverageData: coverage };
                } catch (err) {
                    console.error("Fallimento coverage, procedo comunque...");
                    return { coverageData: { error: "Non disponibile o fallito" } };
                }
            })

            // Nodo 3: AI Analysis
            .addNode('ai_analysis', async (state) => {
                const semgrepRaw = fs.readFileSync(state.reportPath as string, 'utf-8');
                
                // Prepariamo un contesto che includa sia Semgrep che Coverage
                const coverageContext = JSON.stringify(state.coverageData, null, 2);

                const response = await model.invoke([
                    new SystemMessage(
                        `Sei un esperto di sicurezza e qualità del codice. 
                        Analizza il report Semgrep (sicurezza) e i dati di Test Coverage (qualità).
                        Crea un report discorsivo che metta in relazione i due aspetti.`
                    ),
                    new HumanMessage(
                        `Dati Semgrep: \n${semgrepRaw}\n\n 
                        Dati Coverage: \n${coverageContext}`
                    ),
                ]);

                return { analysis: response.content as string };
            })

            // --- Definizione dei collegamenti ---
            .addEdge(START, 'run_scan')
            .addEdge('run_scan', 'run_coverage') // Sequenziale
            .addEdge('run_coverage', 'ai_analysis')
            .addEdge('ai_analysis', END);

        const app = workflow.compile();

        return (await app.invoke({})).analysis;
    }

    private createModel(modelCI: ModelCreateInfo) {
        console.log(`Creazione llm: ${modelCI.name}`);

        return new ChatBedrockConverse({
            model: modelCI.name,
            region: process.env.BEDROCK_AWS_REGION || modelCI.region || 'eu-north-1',
            temperature: modelCI.temperature || 0,
            maxTokens: modelCI.maxTokens || 1000,
        });
    }

    async cloneRepo(url: string): Promise<string> {
        console.log(`Ricevuto: ${url}`);
        
        const repoName = url.split('/').pop()!.replace(/\.git$/, '');
        const clonePath = path.join('/usr/src/repos', repoName);

        console.log(`Esecuzione git clone in ${clonePath}`);

        // Se la cartella esiste già, non clonare di nuovo
        if (fs.existsSync(clonePath)) {
            console.log('Repo già presente localmente.');
            return clonePath;
        }

        // AGGIUNGI AWAIT qui per bloccare l'esecuzione finché non ha finito
        await git.clone({
            http,
            fs,
            dir: clonePath,
            url,
            singleBranch: true, // Opzionale: velocizza il clone
            depth: 1,           // Opzionale: scarica solo l'ultimo commit (più veloce)
        });

        console.log(`Repo clonata con successo in ${clonePath}`);
        return clonePath;
    }
}
