const cron = require('node-cron');
const { fetchAndStoreNews } = require('./news.service');

function startScheduler() {
  // 10:00 AM, 2:00 PM, 6:00 PM daily (Eastern Time)
  cron.schedule('0 10,14,18 * * *', async () => {
    console.log('[News] Starting scheduled sweep...');
    try {
      const result = await fetchAndStoreNews();
      console.log(`[News] Scheduled sweep complete: ${result.count} articles stored.`);
    } catch (err) {
      console.error('[News] Scheduled sweep failed:', err.message);
    }
  }, { timezone: 'America/New_York' });

  console.log('[News] Scheduler started (10:00 AM, 2:00 PM, 6:00 PM ET daily)');
}

module.exports = { startScheduler };
