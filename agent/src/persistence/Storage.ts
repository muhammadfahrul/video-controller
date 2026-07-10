export interface Storage<T> {

    load(): Promise<T>;

    save(data: T): Promise<void>;

}