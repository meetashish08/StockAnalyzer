"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IPC_CHANNELS = void 0;
// IPC Channel names
exports.IPC_CHANNELS = {
    // Database operations
    DB_GET_HOLDINGS: 'db:get-holdings',
    DB_ADD_HOLDING: 'db:add-holding',
    DB_UPDATE_HOLDING: 'db:update-holding',
    DB_DELETE_HOLDING: 'db:delete-holding',
    DB_GET_TRANSACTIONS: 'db:get-transactions',
    DB_ADD_TRANSACTION: 'db:add-transaction',
    // Stock API
    STOCK_GET_QUOTE: 'stock:get-quote',
    STOCK_GET_QUOTES: 'stock:get-quotes',
    STOCK_SEARCH: 'stock:search',
    STOCK_GET_HISTORY: 'stock:get-history',
    // Analysis
    ANALYSIS_GET_SCORE: 'analysis:get-score',
    ANALYSIS_GET_TOP_PICKS: 'analysis:get-top-picks',
    ANALYSIS_PORTFOLIO_HEALTH: 'analysis:portfolio-health',
    // Import
    IMPORT_CSV: 'import:csv',
    IMPORT_EXCEL: 'import:excel',
    IMPORT_PARSE_EMAIL: 'import:parse-email',
    // Portfolio
    PORTFOLIO_GET_SUMMARY: 'portfolio:get-summary',
    PORTFOLIO_GET_ALLOCATION: 'portfolio:get-allocation',
};
//# sourceMappingURL=types.js.map