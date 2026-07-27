import type {

    Agent

} from "../types/Agent";

import Card from "../../../shared/components/Card";

interface Props {

    agent: Agent;

}

export default function AgentStatusCard({

    agent

}: Props) {

    const online =
        (agent.status === "ONLINE" || agent.status === "PLAYING") && agent.isActive === true;

    return (

        <Card>

            <div
                className="
                    flex
                    items-center
                    justify-between
                "
            >

                <div>

                    <h2
                        className="
                            text-lg
                            font-semibold
                            text-white
                        "
                    >

                        🎤 {agent.name}

                    </h2>

                    <p
                        className="
                            mt-1
                            text-sm
                            break-all text-slate-400
                        "
                    >

                        {agent.id}

                    </p>

                </div>

                <div
                    className="
                        flex
                        items-center
                        gap-2
                    "
                >

                    <div
                        className={`
                            h-3
                            w-3
                            rounded-full
                            ${
                                online
                                    ? "bg-teal-300"
                                    : "bg-slate-500"
                            }
                        `}
                    />

                    <span
                        className="
                            text-sm
                            font-medium
                        "
                    >

                        {agent.status}

                    </span>

                </div>

            </div>

            <div
                className="
                    mt-5
                    border-t border-white/8
                    pt-4
                "
            >

                <p
                    className="
                        text-xs
                        text-slate-400
                    "
                >

                    Pembaruan terakhir

                </p>

                <p
                    className="
                        mt-1
                        text-sm
                    "
                >

                    {new Date(
                        agent.lastHeartbeat
                    ).toLocaleTimeString()}

                </p>

            </div>

        </Card>

    );

}
