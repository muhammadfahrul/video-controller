import { promises as fs } from "fs";
import path from "path";

import { Storage } from "./Storage";

export class JsonStorage<T>
implements Storage<T> {

    constructor(

        private readonly file: string,

        private readonly defaultValue: T

    ) {}

    async load(): Promise<T> {

        try {

            const data =

                await fs.readFile(
                    this.file,
                    "utf8"
                );

            return JSON.parse(data);

        }

        catch {

            await this.save(
                this.defaultValue
            );

            return this.defaultValue;

        }

    }

    async save(
        data: T
    ): Promise<void> {

        await fs.mkdir(

            path.dirname(
                this.file
            ),

            {

                recursive: true

            }

        );

        await fs.writeFile(

            this.file,

            JSON.stringify(
                data,
                null,
                2
            )

        );

    }

}