export const errorHandler = (err, req, res, next) => {
  // 1. Log the full error server-side for debugging
  console.error('\n[Global Error Handler] Caught Error:');
  console.error(err);
  import('fs').then(fs => fs.appendFileSync('error_log.txt', new Date().toISOString() + '\\n' + (err.stack || err.message) + '\\n\\n'));

  // 2. Determine status code
  const statusCode = err.statusCode || err.status || 500;
  
  // 3. Return a generic message for 500s to avoid leaking sensitive info.
  // For 4xx errors, we can pass the message through as they are usually validation/client errors.
  const isServerError = statusCode >= 500;
  const safeMessage = isServerError ? 'An internal server error occurred.' : err.message;
  const safeDetail = isServerError ? 'Please try again later or contact support if the issue persists.' : (err.detail || '');

  // Include both 'message' and 'error' keys to ensure compatibility with all frontend parsing methods
  res.status(statusCode).json({
    success: false,
    message: safeMessage,
    error: safeMessage,
    ...(safeDetail && { detail: safeDetail })
  });
};
