import { BrowserManager } from "../browser";

export class PageHealthCheck {

    constructor(

        private readonly browser:

            BrowserManager

    ) {}

    public async check(): Promise<boolean> {

        try {

            if (

                !this.browser.hasPage()

            ) {

                return false;

            }

            const page =

                this.browser.getPage();

            if (

                page.isClosed()

            ) {

                return false;

            }

            await page.title();

            await this.browser.getPageTitle();

            return true;

        }

        catch {

            return false;

        }

    }

}