import { Body, Controller, Get, Post, Redirect } from "@nestjs/common";
import { AgentService } from "./agent.service";
import * as path from 'path';
import * as fs from 'fs';
import { InjectModel } from '@nestjs/mongoose';
import { Report } from '../mongo/mongo.schema';
import { Model } from 'mongoose';


@Controller('agent')
export class AgentController {
  constructor(
    private readonly agentService: AgentService,
    @InjectModel(Report.name) private reportModel: Model<Report>,
  ) { }


  @Post('scan')
  async getScan(@Body() body: { repoLink: string }) {
    const date = new Date();
    const repoName = path.basename(body.repoLink, '.git');
    const report = await this.agentService.execute(body.repoLink);
    const reportsDir = path.resolve('./reports/' + repoName);
    try {
      if (!fs.existsSync(reportsDir)) return 'Cartella reports non trovata';
      const files = fs.readdirSync(reportsDir);

      if (files.length === 0) return 'Nessun file di report trovato';

      const latestFile = path.join(reportsDir, files.at(-1)!);

      // 2. Leggi e Parsea il JSON di Semgrep
      const rawData = fs.readFileSync(latestFile, 'utf-8');
      const semgrepData = JSON.parse(rawData);

      // Mappo i campi dati del json
      const newReport = new this.reportModel({
        name: repoName,
        description: 'Nessuna descrizione',
        date: date,
        report: report,
      });

      console.log("Before save");

      await newReport.save();

      console.log("Report:");
      console.log(newReport.report);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Errore';
      return errorMessage;
    }
    return this.reportModel.find().sort({ date: -1 }).limit(1);
  }

  @Post('clone')
  cloneRepo(@Body('target') url: string) {
    this.agentService.cloneRepo(url);
  }

  @Get('authTest')
  async octokitTest() {
    return await this.agentService.authTest();
  }

  @Get('languages')
  async getLanguages() {
    return await this.agentService.fetchLanguages({ repo: 'PoC', owner: 'Byte-Holders' });
  }
}

const dummy = `# Analisi Report: Vulnerabilità di Sicurezza

Il tool ha fornito informazioni dettagliate sulle potenziali vulnerabilità di sicurezza presenti nei file del **backend** e **frontend**. Questo documento analizza il contenuto del report, evidenziando le problematiche più critiche e spiegando le conseguenze che potrebbero derivarne per la sicurezza dell'applicazione.

## Risultati Principali
Qua ci vanno i **risultati principali**

### Un primo risultati

**Problema**: spiegazione del problema

**Conseguenze**:
- conseguenza 1
- conseguenza 2
- *conseguenza 3*

**Soluzione raccomandata**:
\`Esempio soluzione\`

`;
