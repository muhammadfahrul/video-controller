import { BrowserManager } from "../browser";

export class BrowserHealthCheck {

    constructor(

        private readonly browser:

            BrowserManager

    ) {}

    public async check(): Promise<boolean> {

        try {

            if (

                !this.browser.hasBrowser()

            ) {

                return false;

            }

            if (

                !this.browser.hasPage()

            ) {

                return false;

            }

            const page =

                this.browser.getPage();

            return !page.isClosed();

        }

        catch {

            return false;

        }

    }

}