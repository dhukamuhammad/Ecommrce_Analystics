// Success aur Error response bhejne ka ek universal function
const successResponse = (res, statusCode, message, data = {}) => {
    return res.status(statusCode).json({
        success: true,
        message: message,
        data: data
    });
};

const errorResponse = (res, statusCode, message, errorDetails = null) => {
    return res.status(statusCode).json({
        success: false,
        message: message,
        error: errorDetails
    });
};

module.exports = {
    successResponse,
    errorResponse
};