
const 
rp = require('request-promise'),
util = require('util'),
config = require('./config');


/*
The order for setting up a group is
1.  Creating a group
2.  Add persons to the group
3.  Add faces to the person 
4.  Train the group
*/

module.exports.createGroupAsync=async (personGroupId,groupDisplayName)=>{

	let options={
		method: 'PUT',
		url: 'https://'+config.COGNITIVE_LOCATION+'.'+config.COGNITIVE_BASE_ROUTE+'/persongroups/'+personGroupId,
    headers:{'Ocp-Apim-Subscription-Key':config.COGNITIVE_SUBS_KEY},
    json:true,
    body:{'name':groupDisplayName}
  }

  return rp(options);

}

//Add a person to the group and returns a personId
module.exports.addPersonToPersonGroupAsync=(personGroupId,displayName)=>{
		let options={
		method: 'POST',
		url: 'https://'+config.COGNITIVE_LOCATION+'.'+config.COGNITIVE_BASE_ROUTE+'/persongroups/'+personGroupId+'/persons',	
    headers:{'Ocp-Apim-Subscription-Key':config.COGNITIVE_SUBS_KEY},
    json: true ,
    body: {"name":displayName}
  }
  return rp(options);
}


module.exports.addFacesToPersonAsync= util.promisify(addFacesToPerson);

//Adds a set of faces to a person for training purposes
async function addFacesToPerson(personGroupId,personId,faceUrls,callback){

	let addedFacesCount=0;

	let options={
		method: 'POST',
		url: 'https://'+config.COGNITIVE_LOCATION+'.'+config.COGNITIVE_BASE_ROUTE
				+'/persongroups/'+personGroupId+'/persons/'+personId+'/persistedFaces',	
	  headers:{'Ocp-Apim-Subscription-Key':config.COGNITIVE_SUBS_KEY},
	  json: true,
	}

	for(let i=0;i<faceUrls.length;i++){
		try{

			options.body = {'url':faceUrls[i]};
			await rp(options);
			addedFacesCount++;

		}catch(error){
			console.log("Error: Failed to add face for URL:"+faceUrls[i] +"\n"+error.message);
			//ignore errors and continue with the other pictures
		}
	}

	callback(null,addedFacesCount);
}


//requests training for a group
module.exports.trainPersonGroupAsync=(personGroupId)=>{

	let options={
		method: 'POST',
		url: 'https://'+config.COGNITIVE_LOCATION+'.'+config.COGNITIVE_BASE_ROUTE+'/persongroups/'+personGroupId+'/train',
    headers:{'Ocp-Apim-Subscription-Key':config.COGNITIVE_SUBS_KEY},

  }
  return rp(options);
}




/*
Returns all the faces from a personGroup on a picture
The returned value is an array of personIds and the path of the picture
*/
module.exports.detectPersonsInPhotoAsync = util.promisify(detectPersonsInPhoto);

//path is passed simply as a reference as photoURL is normally a temporary link
async function detectPersonsInPhoto(personGroupId,photoURL,path,callback){
  	
	 	 try{

	 	 	let options={
				method: 'POST',
				url: 'https://'+config.COGNITIVE_LOCATION+'.'+config.COGNITIVE_BASE_ROUTE+'/detect',
		    headers:{'Ocp-Apim-Subscription-Key':config.COGNITIVE_SUBS_KEY},
		    json:true,
		    body:{'url':photoURL}
	 	 	}

	 	 	//Detect all the faces in the url
	 	 	let response = await rp(options);


	 	 	//put all the faceIds into a single array
	 	 	var faceIds = response.map(function (entry) {
	      return entry.faceId;
	    });

	    console.log("found "+faceIds.length+" faces in picture");

	 	 	//if no faces found on the picture return
	    if(!faceIds || faceIds.length==0) return callback();

	    //Check if any of those faces belong to the specified personGroup
	    options.url = 'https://'+config.COGNITIVE_LOCATION+'.'+config.COGNITIVE_BASE_ROUTE+'/identify',
	    options.body ={    
		    "personGroupId":personGroupId,
		    "faceIds":faceIds,
		    "maxNumOfCandidatesReturned":1, //only one candidate per face
		    "confidenceThreshold": 0.5
			}

			response = await rp(options);


			//retrieve all the persons identified in the picture as an array of personIds
			let personIds = response.map(function (entry) {
				if(entry.candidates.length>0){
					 return entry.candidates[0].personId;
				}
	    });

			//remove undefined values
			let cleanedPersonIds = personIds.filter((entry)=>{
				if(entry)return entry;
			});

	    console.log("found "+faceIds.length+" known faces");


			//If no people found resolve with null result
			if(cleanedPersonIds.length==0) return callback();


			//Return tags along the path of the picture
			callback(null,{
				personIds:cleanedPersonIds,
				path:path
			});

	 	 }catch(error){
				callback(new Error("Error detecting person in photo. "+error.message));
		}
}




















