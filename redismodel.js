const util = require('util');
var redis = require("redis"),
client = redis.createClient();



/*
settings are keypars such as:
{
  account_id: "account"
  photos_path: "path",
  azure_group_created: "true/false"
  last_tag_timestamp: "date_last_modified"
}
*/


//saves a single setting
module.exports.saveSingleUserSettingAsync = util.promisify(saveSingleUserSetting);
function saveSingleUserSetting(account_id,setting, value, callback){
  client.hset("settings:"+account_id,setting,value,callback);
}



//Gets all the settings stored for a user
module.exports.getAllUserSettingsAsync = util.promisify(getAllUserSettings);
function getAllUserSettings(account_id,callback){
  client.hgetall("settings:"+account_id,callback);
}



/*face keypar structure
{
  faceId: "face_search_name"
  faceId: "face_search_name"
}
*/

module.exports.saveSingleFaceForUserAsync = util.promisify(saveSingleFaceForUser);
function saveSingleFaceForUser(account_id,faceId,search_name,callback){

  //convert face_search_name to lower
  let search_lower = search_name.toLowerCase().trim();
  client.hset("faces:"+account_id,search_lower,faceId,callback);
}

module.exports.getSingleFaceForAccountIDAsync = util.promisify(getSingleFaceForAccountID);
function getSingleFaceForAccountID(account_id,search_name,callback){
  let search_lower = search_name.toLowerCase().trim();
  client.hget("faces:"+account_id,search_lower,callback);
}

module.exports.getAllFacesForAccountIDAsync = util.promisify(getAllFacesForAccountID);
function getAllFacesForAccountID(account_id,callback){
  client.hgetall("faces:"+account_id,callback);
}

