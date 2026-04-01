const HealthService = require('../Services/health.service');

/**
 * Controller for handling health check HTTP requests
 */
class HealthController {
  async getHealth(req, res) {
    try {
      // Delegate to service for business logic
      const healthData = await HealthService.checkStatus();
      const statusCode = healthData.status === 'healthy' ? 200 : 503;
      return res.status(statusCode).json(healthData);
    } catch (error) {
      console.error('Health Check Error:', error);
      return res.status(500).json({ 
        status: 'error',
        error: 'Internal Server Error',
        timestamp: new Date().toISOString()
      });
    }
  }
}

module.exports = new HealthController();
