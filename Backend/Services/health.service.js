/**
 * Business logic for health checks
 */
class HealthService {
  checkStatus() {
    // In a real app, this might check database connection, Redis, etc.
    return {
      status: 'success',
      message: 'BizBuilder API is running smoothly!',
      timestamp: new Date().toISOString(),
    };
  }
}

module.exports = new HealthService();
