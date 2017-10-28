
require('dotenv').config({silent: true});

module.exports = {
	DBX_API_DOMAIN: 'https://api.dropboxapi.com',
	DBX_OAUTH_DOMAIN: 'https://www.dropbox.com',
	DBX_OAUTH_PATH: '/oauth2/authorize',
	DBX_TOKEN_PATH: '/oauth2/token',
	DBX_LIST_FOLDER_PATH:'/2/files/list_folder',
	DBX_LIST_FOLDER_CONTINUE_PATH:'/2/files/list_folder/continue',
	DBX_GET_TEMPORARY_LINK_PATH:'/2/files/get_temporary_link',
	DBX_APP_KEY:process.env.DBX_APP_KEY,
	DBX_APP_SECRET:process.env.DBX_APP_SECRET, 
	OAUTH_REDIRECT_URL:process.env.OAUTH_REDIRECT_URL,
	SESSION_ID_SECRET:process.env.SESSION_ID_SECRET,
	DBX_TOKEN:process.env.DBX_TOKEN,
	COGNITIVE_LOCATION:'westcentralus',
	COGNITIVE_BASE_ROUTE:'api.cognitive.microsoft.com/face/v1.0',
	COGNITIVE_SUBS_KEY:process.env.COGNITIVE_SUBS_KEY,
}