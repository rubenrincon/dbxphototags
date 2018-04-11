//Dropbox SDK requires this line
require('isomorphic-fetch'); 

const
imgController = require('./imgservices'),
config = require('./config'),
dbxServices = require('./dbxServices'),
Dropbox = require('dropbox').Dropbox,
store = require('./redismodel');




/*
Creates a group
can be run directly from command line with
node -e 'require("./groupScripts.js").createGroup("rinconcaicedo","Familia Rincon Caicedo")'
*/

module.exports.createGroup =async function(personGroupId,groupDisplayName){
 
	
	try{
		await imgController.createGroupAsync(personGroupId,groupDisplayName);
		console.log("Group created:"+personGroupId);

	}catch(error){
		console.log("Error creating group: "+error.message);
	}
}



/*
Adds a person or a set of people to a group.
Notice that the paths will be preceeded by config.DROPBOX_PHOTOS_FOLDER
example to invoke
node -e 'require("./groupScripts.js").addPeopleToGroup(["/isabel","/ruben"])'
*/
module.exports.addPeopleToGroup=  async function(peoplePaths){
	

	let personGroupId= config.GROUP_NAME;
	
	for(let i=0;i<peoplePaths.length;i++){

		try{
		 
		  let path = config.DROPBOX_PHOTOS_FOLDER + peoplePaths[i];
		 //get an array with all the person images

  		let dbx = new Dropbox({ accessToken: config.DBX_TOKEN });

		  let result = await dbxServices.getTemporaryLinksForFolderAsync(dbx,path,null,null,null);

		  let person = {}
		  person.name= peoplePaths[i].substring(peoplePaths[i].lastIndexOf('/')+1);
		  person.faceUrls= result.temporaryLinks;

		  //Add person to the group
		  result = await imgController.addPersonToPersonGroupAsync(personGroupId,person.name);
		  let personId= result.personId;

		  //Add faces to the person
			let facesAddedCount = await imgController.addFacesToPersonAsync(personGroupId, personId, person.faceUrls);

			//save person in memory
			await store.saveKey(person.name,personId);

			console.log(facesAddedCount + "faces added to "+person.name);

		}catch(error){
			console.log("error adding person to group: " + error.message);
		}
	}


	try{
		//after each person is added, train the group
		await imgController.trainPersonGroupAsync(personGroupId);
		console.log("success");

	}catch(error){
		console.log("error training group. "+error.message);
	}
}




