
require('dotenv').config({silent: true});

module.exports = {
	DROPBOX_PHOTOS_FOLDER:'/photos',
	DBX_APP_KEY:process.env.DBX_APP_KEY,
	DBX_APP_SECRET:process.env.DBX_APP_SECRET, 
	OAUTH_REDIRECT_URL:process.env.OAUTH_REDIRECT_URL,
	SESSION_ID_SECRET:process.env.SESSION_ID_SECRET,
	COGNITIVE_LOCATION:'westcentralus',
	COGNITIVE_BASE_ROUTE:'api.cognitive.microsoft.com/face/v1.0',
	COGNITIVE_SUBS_KEY:process.env.COGNITIVE_SUBS_KEY,
}