import { Controller, Get } from "@nestjs/common";
import { AgentService } from "./agent.service";
import * as mongoose from "mongoose";

class ReportDto {
  name: string;
  description: string;
}

const reportDtoSchema = new mongoose.Schema<ReportDto>({
  name: String,
  description: String,
});

const ReportModel = mongoose.model('report', reportDtoSchema);

@Controller("agent")
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  @Get()
  async testConnection() {
    const newReport = new ReportModel({
      name: "TestReportName",
      description: "TestReportDescription",
    });
    newReport.save().catch((reason) => { console.log("Failed on report save") });
  }
}
