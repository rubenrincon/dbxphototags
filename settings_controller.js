//Dropbox SDK requires this line
require('isomorphic-fetch'); 

const 
imgController = require('./imgservices'),
dbxservices = require('./dbxservices'),
config = require('./config'),
store = require('./redismodel'),
Dropbox = require('dropbox').Dropbox,
util = require('util');
 

module.exports.tag = async(req,res,next)=>{ 

  let token = req.session.token;
  //If not token, redirect to login
  if(!token) return res.redirect('/login');

  let hasmore=true;
  let cursor=null;
  let limit =5;
  let dbx = new Dropbox({ accessToken: token });
  
  //Default values for last_modified and path
  let last_modified=null;
  let path = config.DROPBOX_PHOTOS_FOLDER; 

  let account_id;
  let group_name;


  //Retrieve group information, if cannot be obtained return with error
  try{

    //get Dropbox account info 
    let account_info = await dbx.usersGetCurrentAccount();
    account_id = account_info.account_id;
   
    group_name = await getGroupNameFromAccountIDAsync(account_id);

    let settings = await store.getAllUserSettingsAsync(account_id);

    if(settings){
      last_modified=settings.last_tag_timestamp? settings.last_tag_timestamp:null;
      path=settings.photos_path?settings.photos_path:config.DROPBOX_PHOTOS_FOLDER;
    }

  }catch(error){
    console.log(error);
    res.status(500);
    res.send("\nError retrieving Azure group: "+error.message);
    return;
  }


  //user can force to retag everything with the parameter tagall=true
  if(req.query.tagall && req.query.tagall=='true') last_modified=null;
  if(last_modified)console.log("Tagging images after "+last_modified);


  while(hasmore){

    try{

      let imgPathsResult= await dbxservices.getTemporaryLinksForFolderAsync(dbx,path,cursor,limit,last_modified);
      
      cursor=imgPathsResult.cursor;
      hasmore=imgPathsResult.hasmore;

      console.log("\nfound "+imgPathsResult.temporaryLinks.length +" images ...");

      //iterate over a list of eligible images in a folder
      for(let i=0;i<imgPathsResult.temporaryLinks.length;i++){

        //Detect persons on each photo
        let result = await imgController.detectPersonsInPhotoAsync(group_name,imgPathsResult.temporaryLinks[i],imgPathsResult.imgPaths[i]);
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
        res.send(dateIsoString);
      }

    }catch(error){
      console.log(error);
      hasmore=false;
      res.status(500);
      res.send("\nError tagging folder: "+error.message);
    }
  }
}


module.exports.settings = async (req,res,next)=>{ 

  let token = req.session.token;

  //If not token, redirect to login
  if(!token) return res.redirect('/login');

  let dbx = new Dropbox({ accessToken: token });

  try{

    let account_info = await dbx.usersGetCurrentAccount();
    let account_id = account_info.account_id;

    let settings = await store.getAllUserSettingsAsync(account_id);

    let return_data ={}

    if(settings){

      return_data.names = await store.getAllFaceNamesForAccountIDAsync(account_id);
      return_data.last_modified = settings.last_tag_timestamp;
      return_data.path= settings.photos_path?settings.photos_path:config.DROPBOX_PHOTOS_FOLDER; 

    }else{
      return_data.path= config.DROPBOX_PHOTOS_FOLDER; 
    }

    return_data.layout = false;
    res.render('configuration', return_data);


  }catch(error){
    console.log(error);
    res.next(new Error("error reading configuration"));

  }

}



module.exports.addface = async (req,res,next)=>{ 


  let token = req.session.token;

  //If not token, redirect to login
  if(!token) return res.redirect('/login');

  try{

      let dbx = new Dropbox({ accessToken: token });

      let search_name = req.body.search_name;
      let path = req.body.path;

      //get Dropbox account info 
      let account_info = await dbx.usersGetCurrentAccount();
      account_id = account_info.account_id;

      let group_name = await getGroupNameFromAccountIDAsync(account_id);

      let result = await dbxservices.getTemporaryLinksForFolderAsync(dbx,path,null,null,null);

      let faceUrls= result.temporaryLinks;

      //Add person to the group
      result = await imgController.addPersonToPersonGroupAsync(group_name,search_name);
      let personId= result.personId;

      //Add faces to the person
      let facesAddedCount = await imgController.addFacesToPersonAsync(group_name, personId, faceUrls);

      await imgController.trainPersonGroupAsync(group_name);

      //save person in memory
      await store.saveSingleFaceForUserAsync(account_id,personId,search_name);

      console.log(facesAddedCount + "faces added to "+search_name);
      res.send(search_name);

  }catch(error){
    res.status(500);
    res.send("\nError adding face: "+error.message);
  }

}

/* Returns the personGroupId from Azure cognitive services.
If there is no group found in the settings, it will create it based on account_id
*/
const getGroupNameFromAccountIDAsync = util.promisify(getGroupNameFromAccountID);
async function getGroupNameFromAccountID(account_id,callback){
  try{

    let group_name;

    let settings = await store.getAllUserSettingsAsync(account_id);

    if(!settings || !settings.azure_group){
      //If group has not been created in Azure, create it according to Azure rules
      group_name=account_id.substring(5).toLowerCase();
      await imgController.createGroupAsync(group_name,group_name);
      await store.saveSingleUserSettingAsync(account_id,"azure_group",group_name);
    }else{
      group_name = settings.azure_group;
    }
    callback(null,group_name);
  }catch(error){
    callback(new Error("could not create or retrieve Azure group: "+error.message));
  }
}
