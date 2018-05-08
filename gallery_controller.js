//Dropbox SDK requires this line
require('isomorphic-fetch'); 

const 
dbxservices = require('./dbxservices'),
config = require('./config'),
store = require('./redismodel'),
Dropbox = require('dropbox').Dropbox;
 
module.exports.gallery = async (req,res,next)=>{    

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
      let photos_path = (settings && settings.photos_path)? settings.photos_path:config.DROPBOX_PHOTOS_FOLDER;
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
      res.render('empty', {layout:false});
    }    

  }catch(error){
    console.log(error);
    let message= error.error_summary?error.error_summary:error.message;
    return next(new Error("Error getting images from Dropbox: "+message));
  }
 
}