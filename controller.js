//Dropbox SDK requires this line
require('isomorphic-fetch'); 

const 
imgController = require('./imgservices'),
dbxservices = require('./dbxservices'),
crypto = require('crypto'),
config = require('./config'),
store = require('./redismodel'),
rp = require('request-promise'),
Dropbox = require('dropbox').Dropbox,
NodeCache = require( "node-cache" ),
util = require('util');

var mycache = new NodeCache();
 

module.exports.home = async (req,res,next)=>{    

  let token = req.session.token;

  //If not token, redirect to login
  if(!token) return res.redirect('/login');

  let dbx = new Dropbox({ accessToken: token });

  try{

    let result = await dbxservices.getTemporaryLinksForFolderAsync(dbx,config.DROPBOX_PHOTOS_FOLDER,null,null,null); 

    let paths = result.temporaryLinks;

    if(paths.length>0){
      res.render('gallery', { imgs: paths, layout:false});
    }else{
      //if no images, ask user to upload some
      res.render('empty', {layout:false});
    }    

  }catch(error){
    return next(new Error("Error getting images from Dropbox"));
  }
  
};


module.exports.login = (req,res,next)=>{

  //create a random state value and store it for 10 mins
  let state = crypto.randomBytes(16).toString('hex');
  mycache.set(state, req.sessionID, 600);

  let dbx = new Dropbox({clientId: config.DBX_APP_KEY});

  //get a redirect URL from Dropbox using code authentication
  let dbxRedirect= dbx.getAuthenticationUrl(config.OAUTH_REDIRECT_URL , state, 'code');

  res.redirect(dbxRedirect);
}



module.exports.oauthredirect = async (req,res,next)=>{

  if(req.query.error_description){
    return next( new Error(req.query.error_description));
  } 

  let state= req.query.state;

  //compare state in the query with previously stored state
  if(mycache.get(state)!=req.sessionID){
    return next(new Error("session expired or invalid state"));
  } 

  let code = req.query.code;
  //Exchange code for token

  console.log("code="+code);
  if(code){

    try{

      let dbx = new Dropbox({
        clientId: config.DBX_APP_KEY,
        clientSecret: config.DBX_APP_SECRET
      });

      let token = await dbx.getAccessTokenFromCode(config.OAUTH_REDIRECT_URL, code) ;
      
      await regenerateSessionAsync(req);
      req.session.token = token;
      console.log("Token="+token);
      
      res.redirect("/");

    }catch(error){
      return next(new Error('error getting token. '+error.message));
    }        
  }
}



//Returns a promise that fulfills when a new session is created
function regenerateSessionAsync(req){
  return new Promise((resolve,reject)=>{
    req.session.regenerate((err)=>{
      err ? reject(err) : resolve();
    });
  });
}



module.exports.logout = async (req,res,next)=>{
  try{
    await destroySessionAsync(req);
    res.redirect("/login");
  }catch(error){
    return next(new Error('error logging out. '+error.message));
  }  
}

//Returns a promise that fulfills when a session is destroyed
function destroySessionAsync(req){
  return new Promise(async (resolve,reject)=>{
    //first try to revoke token
    try{
      let token = req.session.token;
      if(token){
        let dbx = new Dropbox({ accessToken: token });
        await dbx.authTokenRevoke();
      }
    }catch(error){
      console.log("error revoking token: "+error.message);
    }  
    //then destroy the session
    req.session.destroy((err)=>{
      err ? reject(err) : resolve();
    });
  });
}



module.exports.search = async (req,res,next)=>{    

  let token = req.session.token;
  //If not token, redirect to login
  if(!token) return res.redirect('/login');

  let dbx = new Dropbox({ accessToken: token });

  try{

    //get Dropbox account info 
    let account_info = await dbx.usersGetCurrentAccount();
    account_id = account_info.account_id;

    let personId= await store.getSingleFaceForAccountIDAsync(account_id,req.params.name);
    console.log('found '+personId);

    // Get the paths to the files
    let paths = await dbxservices.searchPropertyAsync(dbx,personId);

    console.log("paths to search");
    console.log(paths);

    if(paths.length>0){

      //Get temporary links for files
      let temporaryLinks = await dbxservices.getTemporaryLinksForPathsAsync(dbx,paths);
      res.render('gallery', { imgs: temporaryLinks, layout:false});

    }else{
      //if no images, ask user to upload some
      res.render('empty', {layout:false});
    }    

  }catch(error){
    console.log(error);
    return next(new Error("Error getting images from Dropbox"));
  }

}



module.exports.tag = async(req,res,next)=>{ 

  let token = req.session.token;
  //If not token, redirect to login
  if(!token) return res.redirect('/login');

  let hasmore=true;
  let cursor=null;
  let limit =5;
  let dbx = new Dropbox({ accessToken: token });
  let path = config.DROPBOX_PHOTOS_FOLDER;
  

  let account_id;
  let group_name;
  let last_modified;


  //Retrieve group information, if cannot be obtained return with error
  try{

    //get Dropbox account info 
    let account_info = await dbx.usersGetCurrentAccount();
    account_id = account_info.account_id;
   
    group_name = await getGroupNameFromAccountIDAsync(account_id);

    //get the last tagging event
    let settings = await store.getAllUserSettingsAsync(account_id);
    console.log("settings");
    console.log(settings);
    if(settings && settings.last_tag_timestamp) last_modified=settings.last_tag_timestamp;


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
        let templateID = await dbxservices.getTemplateIDAsync(dbx);
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

    console.log("Dropbox account_id="+account_id);

    let settings = await store.getAllUserSettingsAsync(account_id);

    let return_data ={}

    if(settings){

     // let faces = await store.getFacesForAccountIDAsync(account_id);
     // let face_names = [];
     // if(faces){
         // get face_names

      //}

    //  return_data.names = face_names;
      return_data.last_modified = settings.last_tag_timestamp;
      return_data.path= settings.photos_path;

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


const getGroupNameFromAccountIDAsync = util.promisify(getGroupNameFromAccountID);
async function getGroupNameFromAccountID(account_id,callback){
  try{

    //If group has not been created in Azure, create it
    let settings = await store.getAllUserSettingsAsync(account_id);
    if(!settings || !settings.azure_group_created){
      await imgController.createGroupAsync(group_name,group_name);
      await store.saveSingleUserSettingAsync(account_id,"azure_group_created",true);
    }
    let group_name=account_id.substring(5).toLowerCase();
    callback(null,group_name);
  }catch(error){
    callback(new Error("could not create or retrieve Azure group: "+error.message));
  }
}
