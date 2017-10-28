const
imgController = require('./imgservices'),
config = require('./config'),
dbxServices = require('./dbxServices'),
store = require('./redismodel');






async function createGroup(personGroupId,groupDisplayName,peoplePaths){

	let persons = [];

	for(let i=0;i<peoplePaths.length;i++){

		try{
		 
		  let result = await dbxServices.getTemporaryLinksForFolderAsync(peoplePaths[i]);

		  let person = {}
		  person.name= peoplePaths[i].substring(peoplePaths[i].lastIndexOf('/')+1);
		  person.faceUrls= result.temporaryLinks;

		  persons.push(person);

		}catch(error){
			console.log(error);
		}
	}

	try{


		//create group
		await imgController.createGroupAsync(personGroupId,groupDisplayName);


		for(let i=0;i<persons.length;i++){

			let person = persons[i];

			//Add person to the group
		  let result = await imgController.addPersonToPersonGroupAsync(personGroupId,person.name);
		  let personId= result.personId;

		  //Add faces to the person
			let facesAddedCount = await imgController.addFacesToPersonAsync(personGroupId, personId, person.faceUrls);

			console.log(facesAddedCount + "faces added to "+person.name);

			//save person in local memory
			await store.savePersonId(person.name,personId);

		}


		//after each person is added, train the group
		await imgController.trainPersonGroupAsync(personGroupId);

		console.log("success adding persons to group");


	}catch(error){
		console.log(error);
	}
}


module.exports.search = async (req,res,next)=>{    

  let token = req.session.token;
  if(token){
    try{

    	dbxServices.initializeDropbox(token);

    	let personId= await store.getPersonIdValue(req.params.name);
			console.log('found '+personId);

			// Get the paths to the files
			let paths = await dbxServices.searchProperty(personId);

			console.log("paths to search");
			console.log(paths);

      if(paths.length>0){

      	//Get temporary links for files
      	let temporaryLinks = await dbxServices.getTemporaryLinksForPathsAsync(paths);
        res.render('gallery', { imgs: temporaryLinks, layout:false});

      }else{
        //if no images, ask user to upload some
        res.render('empty', {layout:false});
      }    

    }catch(error){
    	console.log(error);
      return next(new Error("Error getting images from Dropbox"));
    }

  }else{
    res.redirect('/login');
  }
}



module.exports.tag =(req,res,next)=>{ 

  let token = req.session.token;
  if(token){
    try{

    	dbxServices.initializeDropbox(token);
			tagFolder();
			res.send("Tagging folder ... look at your console");

    }catch(error){
    	console.log(error);
      return next(new Error("Error getting images from Dropbox"));
    }

  }else{
    res.redirect('/login');
  }

}



/*
Returns an array with objects in the following format
[
	{ 'name': 'person1 name',
	  'personId': '8786766'
	},
	{ 'name': 'person2 name',
	  'personId': '8786766'
	},
]
*/

async function tagFolder(){

	let path='';
	let hasmore=true;
	let cursor=null;
	let limit =5;

	while(hasmore){
		let imgPathsResult= await dbxServices.getTemporaryLinksForFolderAsync(path,cursor,limit);
		cursor=imgPathsResult.cursor;
		hasmore=imgPathsResult.hasmore;

		console.log("read "+imgPathsResult.temporaryLinks.length +" images");

		//iterate over a list of eligible images in a folder
		for(let i=0;i<imgPathsResult.temporaryLinks.length;i++){

			try{

					let result = await imgController.detectPersonsInPhotoAsync("rinconcaicedo",imgPathsResult.temporaryLinks[i],imgPathsResult.imgPaths[i]);

					if(!result){
						console.log('no person in picture');
						continue;
					}else{


							let templateID = await dbxServices.getTemplateIDAsync();

							await dbxServices.addPropertiesAsync(templateID,result.path,result.personIds);

							console.log("Added "+result.personIds.length+" persons to "+result.path);
					}

			}catch(error){
				console.log(error)
				if(error.message.indexOf("RateLimitExceeded"))break;
			}
		}

	}
}


//uncomment to test group

// paths= ['/isabel','/ruben','/benjy'];
// dbxServices.initializeDropbox(config.DBX_TOKEN);
// createGroup("rinconcaicedo","Familia Rincon Caicedo", paths);



