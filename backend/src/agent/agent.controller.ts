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
  ) {}

  @Get('results')
  async findReports() {
    return this.reportModel.find().sort({ date: -1 }).limit(1);
  }

  @Post('scan')
  @Redirect()
  async getScan(@Body() body: { repoLink: string }) {
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
    this.agentService.cloneRepo(url);
  }
}
