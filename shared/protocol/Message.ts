export interface Message<T = unknown> {

    type: string;

    payload?: T;

}