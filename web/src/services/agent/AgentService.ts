import { apiService } from "../index";

export interface AgentDto {

    id: string;

    name: string;

    status: string;

    lastHeartbeat: number;

    isActive?: boolean;

}

export class AgentService {

    async list(): Promise<AgentDto[]> {

        return await apiService.get<AgentDto[]>(

            "/api/agents"

        );

    }

}