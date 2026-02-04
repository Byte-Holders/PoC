import { Injectable } from "@nestjs/common";
//import { HttpService } from "@nestjs/axios";
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';

@Injectable()
export class AgentService {
  constructor(/* private readonly httpService: HttpService */) {}

  dateStr = new Date().toISOString().replace(/[:.]/g, '-');
  reportPath = path.resolve(`./reports/test_scan_${this.dateStr}.json`);

  async runSemgrepScan() {
    console.log('Avvio test Semgrep...');

    //Se non esiste la cartella report la crea
    const outputDir = path.dirname(this.reportPath);
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
      const projectRoot = process.cwd();
      console.log(`Scansione in corso su: ${projectRoot}`);

      execSync(
        `semgrep scan ${projectRoot} --config auto --json --output ${this.reportPath} --exclude=node_modules --exclude=reports --exclude=dist --quiet`,
        {
          stdio: 'inherit',
          encoding: 'utf-8',
        },
      );
      console.log(`Scansione completata. File salvato in: ${this.reportPath}`);

    } catch (error) {
      console.error("Errore durante l'esecuzione di Semgrep:", error);
    }
  }
}
