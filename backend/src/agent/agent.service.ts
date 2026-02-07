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

import dotenv from 'dotenv';

dotenv.config();

const AgentState = Annotation.Root({
  reportPath: Annotation<string | unknown>(),
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
    const repoPath = repoLink.split('/').pop()!;
    if (repoPath.length <= 0) {
      return console.log('Nessuna repo trovata.');
    }
    const model = this.createModel({
      name: 'qwen.qwen3-coder-30b-a3b-v1:0',
    });
    const workflow = new StateGraph(AgentState)

      // Nodo 1: Esegue la tua scansione
      .addNode('run_scan', async () => {
        const pathGenerated = await this.runSemgrepScan(repoPath);
        return { reportPath: pathGenerated };
      })

      .addNode('ai_analysis', async (state) => {
        // non gestisco errori
        const fullJsonRaw = fs.readFileSync(
          state.reportPath as string,
          'utf-8',
        );

        console.log('Chiamata al modello');
        const response = await model.invoke([
          new SystemMessage(
            `Crea un report dettagliato e discorsivo(non elenco puntato) del file report restituito da Semgrep, facendo notare le vulnerabilita' piu critiche`,
          ),
          new HumanMessage(
            `Ecco il file JSON integrale della scansione: \n\n ${fullJsonRaw}`,
          ),
        ]);

        console.log(`Riassunto generato: ${response.content as string}`);

        return { analysis: response.content as string };
      })

      .addEdge(START, 'run_scan')
      .addEdge('run_scan', 'ai_analysis')
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

   cloneRepo(url: string) {
    console.log(`Ricevuto: ${url}`);
    const clonePath: string = path.join('/usr/src/repos', url.split('/').findLast(() => true)!);

    console.log(`Esecuzione git clone, verrà salvata in ${clonePath}`);

     git.clone({
      http,
      fs,
      dir: clonePath,
      url,
    });

    console.log(`Repo clonata in ${clonePath}`);
  }
}
