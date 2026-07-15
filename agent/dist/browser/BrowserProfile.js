"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BrowserProfile = void 0;
const path_1 = __importDefault(require("path"));
class BrowserProfile {
    profileDir = path_1.default.join(process.cwd(), "browser-profile");
    getPath() {
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
exports.BrowserProfile = BrowserProfile;
