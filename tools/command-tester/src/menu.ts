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

                "FULLSCREEN",
                
                "EXIT_FULLSCREEN",

                "TOGGLE_FULLSCREEN",

                "ADD_QUEUE",

                "REMOVE_QUEUE",

                "CLEAR_QUEUE",

                "PLAY_QUEUE_ITEM",

                "SHUFFLE_QUEUE",

                "REPEAT_OFF",

                "REPEAT_ONE",

                "REPEAT_ALL",

                "EXIT"

            ]

        }

    ]);

}