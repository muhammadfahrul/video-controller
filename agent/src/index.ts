import { Agent } from "./agent/Agent";

async function main() {

    const agent = new Agent();

    await agent.start();

    const youtube = agent.getYouTube();

    await youtube.open("dQw4w9WgXcQ");

}

main().catch(console.error);