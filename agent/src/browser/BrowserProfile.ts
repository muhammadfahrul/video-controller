import path from "path";
import fs from "fs";

export class BrowserProfile {

    private readonly profileDir =
        path.join(
            process.cwd(),
            "browser-profile"
        );

    public getPath(): string {

        // if (!fs.existsSync(this.profileDir)) {

        //     fs.mkdirSync(
        //         this.profileDir,
        //         {
        //             recursive: true
        //         }
        //     );

        // }

        // return this.profileDir;

        return "";

    }

}