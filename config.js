
require('dotenv').config({silent: true});

module.exports = {
	DROPBOX_PHOTOS_FOLDER:'/photos',
	STORE_LAST_MODIFIED_KEY:'store_last_modified_timestamp_ISO_format',
	TRAINING_FOLDER_PATH: '/training',
	DBX_APP_KEY:process.env.DBX_APP_KEY,
	DBX_APP_SECRET:process.env.DBX_APP_SECRET, 
	OAUTH_REDIRECT_URL:process.env.OAUTH_REDIRECT_URL,
	SESSION_ID_SECRET:process.env.SESSION_ID_SECRET,
	DBX_TOKEN:process.env.DBX_TOKEN,
	COGNITIVE_LOCATION:'westcentralus',
	COGNITIVE_BASE_ROUTE:'api.cognitive.microsoft.com/face/v1.0',
	COGNITIVE_SUBS_KEY:process.env.COGNITIVE_SUBS_KEY,
	GROUP_NAME:'rinconcaicedo'
}