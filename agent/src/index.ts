import { BrowserManager } from "./browser/BrowserManager";

async function main() {

    const browser = new BrowserManager();

    await browser.start();

}

main();