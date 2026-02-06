import { Body, Controller, Get, Post, Query, Redirect } from "@nestjs/common";
import { AgentService } from "./agent.service";
import * as mongoose from "mongoose";
import * as path from 'path';
import * as fs from 'fs';

class ReportDto {
  name: string;
  description: string;
  date: Date;
  report: string;
}

const reportDtoSchema = new mongoose.Schema<ReportDto>({
  name: String,
  description: String,
  date: Date,
  report: String,
});

const reportModel = mongoose.model('report', reportDtoSchema);

@Controller('agent')
export class AgentController {
  constructor(private readonly AgentService: AgentService) { }

  @Get('results')
  async findReports() {
    return reportModel.find().sort({ date: -1 }).limit(1);
  }

  @Get('scan')
  @Redirect()
  async getScan() {
    const date = new Date();
    const report = await this.AgentService.execute();
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
      const newReport = new reportModel({
        name: firstIssue.check_id,
        description: firstIssue.extra?.message || 'Nessuna descrizione',
        date: date,
        report: report,
      });

      await newReport.save();
    } catch (e) {
      return e instanceof Error ? e.message : 'Errore';
    }
    return { url: `../agent/results` };
  }

  @Post('clone')
  cloneRepo(@Body('target') url: string) {
    this.AgentService.cloneRepo(url);
  }
}
