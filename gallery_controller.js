//Dropbox SDK requires this line
require('isomorphic-fetch'); 

const 
dbxservices = require('./dbxservices'),
config = require('./config'),
store = require('./redismodel'),
Dropbox = require('dropbox').Dropbox;
 

module.exports.home = async (req,res,next)=>{    

  let token = req.session.token;

  //If not token, redirect to login
  if(!token) return res.redirect('/login');

  let dbx = new Dropbox({ accessToken: token });

  try{


    //get Dropbox account info 
    let account_info = await dbx.usersGetCurrentAccount();
    account_id = account_info.account_id;
    let settings = await store.getAllUserSettingsAsync(account_id);
    
    let photos_path = (settings && settings.photos_path)? settings.photos_path:config.DROPBOX_PHOTOS_FOLDER;

    let result = await dbxservices.getTemporaryLinksForFolderAsync(dbx,photos_path,null,null,null); 

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