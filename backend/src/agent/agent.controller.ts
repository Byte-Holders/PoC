import { Controller, Get } from "@nestjs/common";
// import { AgentService } from "./agent.service";
import * as mongoose from "mongoose";

class ReportDto {
  name: string;
  description: string;
  date: Date;
}

const reportDtoSchema = new mongoose.Schema<ReportDto>({
  name: String,
  description: String,
  date: Date,
});

const reportModel = mongoose.model('report', reportDtoSchema);

@Controller("agent")
export class AgentController {
  constructor(/* private readonly agentService: AgentService */) { }

  @Get()
  async testConnection() {
    const newReport = new reportModel({
      name: "Nome report",
      description: "Descrizione report",
      date: new Date(),
    });

    const saveResult = await (async () => {
      try {
        await newReport.save();
        return "Salvato il report";
      }
      catch (e: unknown) {
        if (e instanceof Error)
          return "Errore salvataggio report (e: Error)";

        return "Errore salvataggio report (e: not Error)";
      }
    })();

    return saveResult;
  }

  @Get('results')
  async findReports() {
    return await reportModel.find();
  }
}
