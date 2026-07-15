"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DurationFormatter = void 0;
class DurationFormatter {
    static format(iso) {
        const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
        if (!match) {
            return "0:00";
        }
        const hour = Number(match[1] ?? 0);
        const minute = Number(match[2] ?? 0);
        const second = Number(match[3] ?? 0);
        if (hour > 0) {
            return `${hour}:${minute
                .toString()
                .padStart(2, "0")}:${second
                .toString()
                .padStart(2, "0")}`;
        }
        return `${minute}:${second
            .toString()
            .padStart(2, "0")}`;
    }
}
exports.DurationFormatter = DurationFormatter;
//# sourceMappingURL=DurationFormatter.js.map