exports.PORT = process.env.PORT;
exports.APPLICATION = "LEADPORTAL";
exports.AUTH_BASIC_TOKEN = "Basic eWFwcGF5OnlhcHBheQ==";
exports.USER_LOGIN = `${process.env.M2P_AUTH_URL}/user/token`;
exports.VALIDATE_USER = `${process.env.M2P_AUTH_URL}/user/validateUser`;
exports.FORGET_PASSWORD = `${process.env.M2P_AUTH_URL}/user/forgotPassword`;
exports.CHANGE_PASSWORD = `${process.env.M2P_AUTH_URL}/user/changePassword`;
exports.RESET_PASSWORD = `${process.env.M2P_AUTH_URL}/user/resetPassword`;
exports.VALIDATE_OTP = `${process.env.M2P_AUTH_URL}/user/validateOtp`;
exports.SECRETKEY = "39943b68d15aa38be34e5db9b6cb26af";
exports.ACCESSKEY = "b144932091624091b6f3bd3def3303e8";
exports.REFRESHKEY = "7ba349a90adf4d22a4b7b58a1d039b52";
exports.ACCESS_ENC_KEY = "7a8275af6e4145b88204867972ae235f";
exports.EMAIL_NOTIFY = `${process.env.NOTIFY}/email/notify`;
exports.EMAIL_NOTIFY_PRODUCTION = "https://notify.yappay.in/notification/email/notify/";
exports.NOTIFICATION_URL = `${process.env.NOTIFY}/sms/notify`;
exports.NOTIFICATION_EMAIL_URL = `${process.env.NOTIFY}/email/notify`;
exports.MONGOURL = process.env.MONGO_URL;

// S3 Credentials

exports.AWS_ACCESS_KEY_ID = "AKIAVAVRF3HYXV7RNP5M"
exports.AWS_SECRET_ACCESS_KEY = "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"
exports.AWS_BUCKET_NAME = "leadportal"
exports.AWS_REGION = "ap-south-1"
exports.FILE_UPLOAD_SIZE = 2000000
exports.UPLOAD_FILE_PATH = "./dirStorage/file-uploads"
exports.DOWNLOAD_FILE_PATH = "./dirStorage/downloads"