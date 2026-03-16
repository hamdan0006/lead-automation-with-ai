const HealthService = require('../Services/health.service');

/**
 * Controller for handling health check HTTP requests
 */
class HealthController {
  getHealth(req, res) {
    try {
      // Delegate to service for business logic
      const healthData = HealthService.checkStatus();
      return res.status(200).json(healthData);
    } catch (error) {
      console.error('Health Check Error:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }
}

module.exports = new HealthController();
