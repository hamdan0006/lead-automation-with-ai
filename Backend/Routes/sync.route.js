const express = require('express');
const router = express.Router();
const syncController = require('../Controllers/sync.controller');

// Sync local leads to remote server
router.post('/leads', syncController.syncLeadsToServer);

// Receive leads from remote client
router.post('/receive', syncController.receiveLeads);

module.exports = router;
