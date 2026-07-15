"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const SearchController_1 = require("../controllers/SearchController");
const router = (0, express_1.Router)();
const controller = new SearchController_1.SearchController();
router.get("/", controller.search);
exports.default = router;
//# sourceMappingURL=SearchRoutes.js.map