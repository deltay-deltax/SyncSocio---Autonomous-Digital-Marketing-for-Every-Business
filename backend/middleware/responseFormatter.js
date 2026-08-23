export const responseFormatter = (req, res, next) => {
  // Skip webhooks completely
  if (req.originalUrl.includes('/webhook')) {
    return next();
  }

  const originalJson = res.json;

  res.json = function (body) {
    // Prevent double wrapping
    if (body && typeof body === 'object' && !Array.isArray(body) && 'success' in body) {
      return originalJson.call(this, body);
    }

    const isSuccess = res.statusCode >= 200 && res.statusCode < 300;
    
    let standardResponse = {
      success: isSuccess
    };

    if (!isSuccess) {
      if (body && body.message) {
        standardResponse.message = body.message;
        standardResponse.error = body.error || body;
      } else if (typeof body === 'string') {
        standardResponse.message = body;
      } else {
        standardResponse.message = 'An error occurred';
        standardResponse.error = body;
      }
    } else {
      if (body && typeof body === 'object' && !Array.isArray(body) && body.message && body.data) {
        standardResponse.message = body.message;
        standardResponse.data = body.data;
      } else if (body && typeof body === 'object' && !Array.isArray(body) && body.message) {
        standardResponse.message = body.message;
        const { message, ...rest } = body;
        standardResponse.data = Object.keys(rest).length > 0 ? rest : null;
      } else {
        standardResponse.data = body;
      }
    }

    return originalJson.call(this, standardResponse);
  };
  
  next();
};
