import { Injectable } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";

@Injectable()
export class AgentService {
  constructor(private readonly httpService: HttpService) {}
}
