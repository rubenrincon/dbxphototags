const util = require('util'),
config = require('./config');

var redis = require("redis"),
client = redis.createClient();


/*
settings are keypars such as:
{
  photos_path: "path",
  azure_group: "group"
  last_tag_timestamp: "date_last_modified"
  dbx_template_id: "template_id"
}
*/


module.exports.resetSettingsAsync = util.promisify(resetSettings);
function resetSettings(account_id,callback){
  let data={
    photos_path: config.DROPBOX_PHOTOS_FOLDER,
    azure_group: '',
    last_tag_timestamp: '',
    dbx_template_id: ''
  }
  console.log('reset settings');
  client.hmset('settings:'+account_id,data,callback);
}


//saves a single setting
module.exports.saveSingleUserSettingAsync = util.promisify(saveSingleUserSetting);
function saveSingleUserSetting(account_id,setting, value, callback){
  client.hset('settings:'+account_id,setting,value,callback);
}



//Gets all the settings stored for a user
module.exports.getAllUserSettingsAsync = util.promisify(getAllUserSettings);
function getAllUserSettings(account_id,callback){
  client.hgetall('settings:'+account_id,callback);
}



/*face keypar structure
{
  face_search_name: faceId
}
*/

module.exports.saveSingleFaceForUserAsync = util.promisify(saveSingleFaceForUser);
function saveSingleFaceForUser(account_id,faceId,search_name,callback){

  //convert face_search_name to lower
  let search_lower = search_name.toLowerCase().trim();
  client.hset('faces:'+account_id,search_lower,faceId,callback);
}

module.exports.getSingleFaceForAccountIDAsync = util.promisify(getSingleFaceForAccountID);
function getSingleFaceForAccountID(account_id,search_name,callback){
  let search_lower = search_name.toLowerCase().trim();
  client.hget('faces:'+account_id,search_lower,callback);
}

module.exports.getAllFacesForAccountIDAsync = util.promisify(getAllFacesForAccountID);
function getAllFacesForAccountID(account_id,callback){
  client.hgetall('faces:'+account_id,callback);
}


module.exports.getAllFaceNamesForAccountIDAsync = util.promisify(getAllFaceNamesForAccountID);
function getAllFaceNamesForAccountID (account_id,callback){
  client.hkeys('faces:'+account_id,callback);
}

