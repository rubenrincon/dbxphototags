//Dropbox SDK requires this line
require('isomorphic-fetch'); 

const 
imgController = require('./imgservices'),
dbxservices = require('./dbxservices'),
config = require('./config'),
store = require('./redismodel'),
Dropbox = require('dropbox').Dropbox,
util = require('util');


module.exports.updateSettings = async(req,res,next)=>{ 

  //If not token, redirect to login
  if(!req.session.token){
      res.status(401);
      res.send("Couldn't identify user, login again");
      return;
  }

  let event = req.body.event;
  let message_back;

  try{
    if(event=="update_path"){
      message_back = await updatePathAsync(req);
    }else if(event == "add_face"){
      message_back= await addFaceAsync(req);
    }else if(event == "tag_partial" || event == "tag_all"){
      message_back = await tagAsync(event,req);
    }
    res.send(message_back);
  }catch(error){
    res.status(500);
    res.send(error.message);
  }
}


const updatePathAsync = util.promisify(updatePath);
async function updatePath(req,callback){
  try{
    let account_id = req.session.account_id;
    await store.saveSingleUserSettingAsync(account_id,'photos_path',req.body.path);
    callback();
  }catch(error){
    callback(new Error('Couldnt update path: '+error.message));
  }
}
 

const tagAsync = util.promisify(tag);
async function tag (event, req,callback){ 
  
  let path;
  let azure_group;
  let last_modified;
  let account_id = req.session.account_id;


  //Retrieve group information and settings values
  try{
 
    let settings = await store.getAllUserSettingsAsync(account_id);
  
    path = settings.photos_path;
    azure_group = await getGroupNameFromAccountIDAsync(account_id);
  
    if(event=="tag_partial"){
      last_modified= settings.last_tag_timestamp;
    }

  }catch(error){
    return callback(new Error('Error retrieving Azure group: '+error.message));
  }


  let hasmore=true;
  let cursor=null;
  let limit =15;
  let dbx = new Dropbox({ accessToken: req.session.token });

  while(hasmore){

    try{

      let imgPathsResult= await dbxservices.getTemporaryLinksForFolderAsync(dbx,path,cursor,limit,last_modified);
      
      cursor=imgPathsResult.cursor;
      hasmore=imgPathsResult.hasmore;

      console.log("\nfound "+imgPathsResult.temporaryLinks.length +" images ...");

      //iterate over a list of eligible images in a folder
      for(let i=0;i<imgPathsResult.temporaryLinks.length;i++){

        //Detect persons on each photo
        let result = await imgController.detectPersonsInPhotoAsync(azure_group,imgPathsResult.temporaryLinks[i],imgPathsResult.imgPaths[i]);
        if(!result) continue;

        //Add those persons to the file properties
        let templateID = await dbxservices.getTemplateIDAsync(dbx,account_id);
        await dbxservices.addPropertiesAsync(dbx,templateID,result.path,result.personIds);
        console.log("\nAdded "+result.personIds.length+" persons to "+result.path);
            
      }

      //if there are more results continue, otherwise store a timestamp for future tag jobs
      if(!hasmore){
        let dateIsoString = (new Date()).toISOString();
        
        await store.saveSingleUserSettingAsync(account_id,"last_tag_timestamp",dateIsoString);
       // await store.saveKey(config.STORE_LAST_MODIFIED_KEY, dateIsoString);
        
       console.log("\n--> Tagging completed !");
        callback(null,dateIsoString);
      }

    }catch(error){
      console.log(error);
      hasmore=false;
      return callback(new Error('Error tagging folder: '+error.message));
    }
  }
}

const addFaceAsync = util.promisify(addface);
async function addface(req,callback){ 

  try{

      let dbx = new Dropbox({ accessToken: req.session.token });

      let search_name = req.body.search_name;
      let path = req.body.path;
      let account_id = req.session.account_id;

      let azure_group = await getGroupNameFromAccountIDAsync(account_id);

      let result = await dbxservices.getTemporaryLinksForFolderAsync(dbx,path,null,null,null);

      let faceUrls= result.temporaryLinks;

      //Add person to the group
      let person = await imgController.addPersonToPersonGroupAsync(azure_group,search_name);
      let personId= person.personId;

      //Add faces to the person
      let count = await imgController.addFacesToPersonAsync(azure_group, personId, faceUrls);

      await imgController.trainPersonGroupAsync(azure_group);

      //save person in memory
      await store.saveSingleFaceForUserAsync(account_id,personId,search_name);

      console.log(count + "faces added to "+search_name);
      callback(null,search_name);

  }catch(error){
    callback(new Error('Error adding face: '+error.message));
  }
}

/* Returns the personGroupId from Azure cognitive services.
If there is no group found in the settings, it will create it based on account_id
*/
const getGroupNameFromAccountIDAsync = util.promisify(getGroupNameFromAccountID);
async function getGroupNameFromAccountID(account_id,callback){
  try{

    let azure_group;

    let settings = await store.getAllUserSettingsAsync(account_id);

    if(!settings.azure_group){
      //If group has not been created in Azure, create it according to Azure rules
      azure_group=account_id.substring(5).toLowerCase();
      await imgController.createGroupAsync(azure_group,azure_group);
      await store.saveSingleUserSettingAsync(account_id,"azure_group",azure_group);
    }else{
      azure_group = settings.azure_group;
    }
    callback(null,azure_group);
  }catch(error){
    callback(new Error("could not create or retrieve Azure group: "+error.message));
  }
}
