import type { PlayerStatus } from "../types/PlayerStatus";

export class PlayerStateStore {

    private state: PlayerStatus = {

        videoId: null,

        title: null,

        playing: false,

        paused: true,

        ended: false,

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