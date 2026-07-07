export class QueueService {

    private items: QueueItem[] = [];

    private currentIndex = -1;

    public add(
        item: QueueItem
    ) {

        this.items.push(
            item
        );

        if (
            this.currentIndex === -1
        ) {

            this.currentIndex = 0;

        }

    }

    current() {

        if (this.currentIndex < 0) {

            return undefined;

        }

        return this.items[this.currentIndex];

    }

    next() {

        if (

            this.currentIndex + 1 >=

            this.items.length

        ) {

            return undefined;

        }

        this.currentIndex++;

        return this.current();

    }

    previous() {

        if (

            this.currentIndex <= 0

        ) {

            return undefined;

        }

        this.currentIndex--;

        return this.current();

    }

    public size() {

        return this.items.length;

    }

    public getAll() {

        return [...this.items];

    }

    public remove(id: string): boolean {

        const index = this.items.findIndex(
            item => item.id === id
        );

        if (index === -1) {
            return false;
        }

        this.items.splice(index, 1);

        if (this.currentIndex > index) {
            this.currentIndex--;
        } else if (this.currentIndex >= this.items.length) {
            this.currentIndex = this.items.length - 1;
        }

        if (this.items.length === 0) {
            this.currentIndex = -1;
        }

        return true;
    }

    public clear() {

        this.items = [];

        this.currentIndex = -1;

    }

    public playById(
        id: string
    ) {

        const index =
            this.items.findIndex(
                item => item.id === id
            );

        if (
            index === -1
        ) {

            return undefined;

        }

        this.currentIndex =
            index;

        return this.items[
            index
        ];

    }

}