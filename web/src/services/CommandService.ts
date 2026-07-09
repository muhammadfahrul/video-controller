public async seek(
    agentId: string,
    seconds: number
) {

    return this.api.post(

        "/api/commands",

        {

            agentId,

            type: "SEEK",

            position: seconds

        }

    );

}