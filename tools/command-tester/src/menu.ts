import inquirer from "inquirer";

export async function selectCommand() {

    return inquirer.prompt([

        {

            type: "list",

            name: "command",

            message: "Select command",

            choices: [

                "PLAY",

                "PAUSE",

                "STOP",

                "NEXT",

                "PREVIOUS",

                "SEEK",

                "VOLUME",

                "MUTE",

                "OPEN_VIDEO",

                "EXIT"

            ]

        }

    ]);

}