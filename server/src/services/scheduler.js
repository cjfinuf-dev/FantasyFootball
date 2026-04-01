const cron = require('node-cron');
const { fetchAndStoreNews } = require('./news.service');
let detectSituationEvents = null;
try { detectSituationEvents = require('./situation.service').detectSituationEvents; } catch (e) { /* loaded later */ }

function startScheduler() {
  // Every 4 hours (6x/day) for news + situation detection
  cron.schedule('0 2,6,10,14,18,22 * * *', async () => {
    console.log('[News] Starting scheduled sweep...');
    try {
      const result = await fetchAndStoreNews();
      console.log(`[News] Scheduled sweep complete: ${result.count} articles stored.`);

      // Run situation event detection on new articles
      if (detectSituationEvents) {
        try {
          const events = await detectSituationEvents(result.sweepId);
          console.log(`[Situation] Detected ${events} new situation events.`);
        } catch (err) {
          console.error('[Situation] Detection failed:', err.message);
        }
      }
    } catch (err) {
      console.error('[News] Scheduled sweep failed:', err.message);
    }
  }, { timezone: 'America/New_York' });

  console.log('[News] Scheduler started (every 4 hours ET)');
}

module.exports = { startScheduler };
