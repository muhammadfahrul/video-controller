export class HealthScheduler {

    private timer?: NodeJS.Timeout;

    public start(

        interval: number,

        callback: () => Promise<void>

    ) {

        if (this.timer) {

            return;

        }

        this.timer = setInterval(

            () => {

                callback().catch(console.error);

            },

            interval

        );

    }

    public stop() {

        if (!this.timer) {

            return;

        }

        clearInterval(this.timer);

        this.timer = undefined;

    }

}