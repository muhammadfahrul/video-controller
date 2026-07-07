export class QueueService {

    private items: QueueItem[] = [];

    private currentIndex = -1;

    add(item: QueueItem) {

        this.items.push(item);

        if (this.currentIndex === -1) {

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

    getAll() {

        return this.items;

    }

}