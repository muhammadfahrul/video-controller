import { apiService } from "../index";

export interface AgentDto {

    id: string;

    name: string;

    status: string;

    lastHeartbeat: number;

}

export class AgentService {

    async list(): Promise<AgentDto[]> {

        return await apiService.get<AgentDto[]>(

            "/api/agents"

        );

    }

}