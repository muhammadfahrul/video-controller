import {

    ApiService

} from "./ApiService";

export const apiService =

    new ApiService();

export * from "./ApiService";

export * from "./socket";

export * from "./agent";

export * from "./player";

import {

    PlayerCommandService

} from "./player";

export const playerCommandService =

    new PlayerCommandService();