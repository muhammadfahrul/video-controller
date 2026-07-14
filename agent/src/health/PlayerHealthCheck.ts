export class PlayerHealthCheck {

    constructor(
        private readonly player: PlayerService
    ) {}

    public async check(): Promise<boolean> {

        try {

            const snapshot =

                await this.player
                    .getVideoSnapshot();

            if (!snapshot.exists) {

                return false;

            }

            if (!snapshot.ready) {

                return false;

            }

            return true;

        }

        catch {

            return false;

        }

    }

}