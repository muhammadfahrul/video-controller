import { PlayerStatus } from "@shared";

export class PlayerStateStore {

    private state: PlayerStatus = {

        playing: false,

        paused: true,

        volume: 100,

        muted: false,

        currentTime: 0,

        duration: 0

    };

    public get() {

        return this.state;

    }

    public update(

        patch: Partial<PlayerStatus>

    ) {

        this.state = {

            ...this.state,

            ...patch

        };

    }

}