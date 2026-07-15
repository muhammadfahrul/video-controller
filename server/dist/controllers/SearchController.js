"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchController = void 0;
const YoutubeSearchService_1 = require("../youtube/YoutubeSearchService");
class SearchController {
    youtube = new YoutubeSearchService_1.YoutubeSearchService();
    search = async (req, res) => {
        try {
            const keyword = String(req.query.keyword ?? "");
            const result = await this.youtube.search(keyword);
            res.json(result);
        }
        catch (err) {
            console.error(err);
            res.status(500).json({
                message: "Search failed"
            });
        }
    };
}
exports.SearchController = SearchController;
