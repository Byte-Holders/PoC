import { Body, Controller, Get, Post, Query, Redirect } from "@nestjs/common";
import { AgentService } from "./agent.service";
import * as mongoose from "mongoose";
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

  @Get('results')
  async findReports() {
    return this.reportModel.find().sort({ date: -1 }).limit(1);
  }

  @Post('scan')
  async getScan(@Body() body: { repoLink: string }) {
    return dummy;
    const date = new Date();
    const report = await this.agentService.execute(body.repoLink);
    const reportsDir = path.resolve('./reports');

    try {
      if (!fs.existsSync(reportsDir)) return 'Cartella reports non trovata';
      const files = fs.readdirSync(reportsDir);

      if (files.length === 0) return 'Nessun file di report trovato';

      const latestFile = path.join(reportsDir, files[0]);

      // 2. Leggi e Parsea il JSON di Semgrep
      const rawData = fs.readFileSync(latestFile, 'utf-8');
      const semgrepData = JSON.parse(rawData);

      const results = semgrepData.results;

      if (!results || results.length === 0) {
        return 'Il report è valido ma non contiene vulnerabilità (results vuoto).';
      }
      //Prendiamo la prima vulnerabilità trovata
      const firstIssue = results[0];

      // Mappo i campi dati del json
      const newReport = new this.reportModel({
        // name: firstIssue.check_id,
        name: 'Placeholder name',
        // description: firstIssue.extra?.message || 'Nessuna descrizione',
        description: 'Placeholder description',
        date: date,
        report: report,
      });

      console.log("Before save");

      await newReport.save();

      return newReport.report;
    } catch (e) {
      return e instanceof Error ? e.message : 'Errore';
    }
    // unreachable
    // return { url: `../agent/results` };
  }

  @Post('clone')
  cloneRepo(@Body('target') url: string) {
    this.agentService.cloneRepo(url);
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
