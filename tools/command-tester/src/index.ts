import inquirer from "inquirer";

import {
    selectCommand
} from "./menu";

import {
    sendCommand
} from "./api";

async function main() {

    while (true) {

        const {

            command

        } =
            await selectCommand();

        if (command === "EXIT") {

            process.exit(0);

        }

        const payload: any = {

            type: command

        };

        if (command === "VOLUME") {

            const answer =
                await inquirer.prompt([

                    {

                        type: "number",

                        name: "volume",

                        message: "Volume (0-100)"

                    }

                ]);

            payload.volume =
                answer.volume;

        }

        if (command === "SEEK") {

            const answer =
                await inquirer.prompt([

                    {

                        type: "number",

                        name: "seek",

                        message: "Seek (seconds)"

                    }

                ]);

            payload.seek =
                answer.seek;

        }

        if (command === "OPEN_VIDEO") {

            const answer =
                await inquirer.prompt([

                    {

                        type: "input",

                        name: "videoId",

                        message: "Video ID"

                    }

                ]);

            payload.videoId =
                answer.videoId;

        }

        if (command === "ADD_QUEUE") {

            const answer =
                await inquirer.prompt([

                    {

                        type: "input",

                        name: "videoId",

                        message: "Video ID"

                    },

                    {
                        type: "input",
                        name: "title",
                        message: "Title"
                    }

                ]);

            payload.videoId =
                answer.videoId;

            payload.title =
                answer.title;

        }

        console.log();

        console.log(
            "Sending:",
            payload
        );

        try {

            const result =
                await sendCommand(
                    payload
                );

            console.log(
                "Server Response:",
                result
            );

        }
        catch (err: any) {

            console.error(
                err.response?.data ??
                err.message
            );

        }

        console.log();

    }

}

main();