
exports.handler = async function (event, context) {
  // Get deployment information from Netlify environment variables
  const commit = process.env.COMMIT_REF || 'unknown';
  const deployTime = process.env.DEPLOY_TIME || new Date().toISOString();

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "max-age=60" // Cache for 1 minute
    },
    body: JSON.stringify({
      commit,
      timestamp: deployTime,
    }),
  };
};
