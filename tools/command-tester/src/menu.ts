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

                "UNMUTE",

                "OPEN_VIDEO",

                "EXIT",

                "FULLSCREEN",
                
                "EXIT_FULLSCREEN",

                "TOGGLE_FULLSCREEN",

                "ADD_QUEUE",

                "REMOVE_QUEUE",

                "CLEAR_QUEUE"

            ]

        }

    ]);

}