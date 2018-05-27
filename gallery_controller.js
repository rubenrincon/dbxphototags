//Dropbox SDK requires this line
require('isomorphic-fetch'); 

const 
dbxservices = require('./dbxservices'),
config = require('./config'),
store = require('./redismodel'),
Dropbox = require('dropbox').Dropbox;


module.exports.home = async (req,res,next)=>{
  if(!req.session.token) return res.redirect('/login');
  try{

    let account_id = req.session.account_id;
    let settings = await store.getAllUserSettingsAsync(account_id);

    let return_data ={}
    return_data.names = await store.getAllFaceNamesForAccountIDAsync(account_id);
    return_data.last_modified = settings.last_tag_timestamp;
    return_data.path= settings.photos_path;
    return_data.layout = false;

    res.render('index', return_data);

  }catch(error){
    console.log(error);
    res.next(new Error("error reading settings"));
  }
} 

 
module.exports.gallery = async (req,res,next)=>{    

  let photos_path;
  let token = req.session.token;

  //If not token, redirect to login
  if(!token) return res.redirect('/login');

  let dbx = new Dropbox({ accessToken: token });

  try{

    //get Dropbox account info 
    let account_info = await dbx.usersGetCurrentAccount();
    account_id = account_info.account_id;
    let tmp_links_paths =[];

    if(!req.params.name){
      let settings = await store.getAllUserSettingsAsync(account_id);  
      photos_path = settings.photos_path;
      let result = await dbxservices.getTemporaryLinksForFolderAsync(dbx,photos_path,null,null,null); 
 
      tmp_links_paths = result.temporaryLinks;
    }else{

      let personId= await store.getSingleFaceForAccountIDAsync(account_id,req.params.name);
      let paths = await dbxservices.searchPropertyAsync(dbx,personId);

      tmp_links_paths = await dbxservices.getTemporaryLinksForPathsAsync(dbx,paths);
    }
    if(tmp_links_paths.length>0){
      res.render('gallery', { imgs: tmp_links_paths, layout:false});
    }else{
      //if no images, ask user to upload some
      return next(new Error("No images found in the "+photos_path+" folder"));
    }    

  }catch(error){
    let message;
    if(error.message.indexOf('path/not_found/')){
      message= "The folder "+ photos_path +" does not exist on your Dropbox, create it and upload some images, or change the path using the Settings";
    }else{
      message= "Error getting images from Dropbox: "+error.message;
    }
    return next(new Error(message));
  }
}