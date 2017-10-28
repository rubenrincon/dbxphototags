
const 
rp = require('request-promise'),
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

//Internal function to add faces to a person
//returns a promise that fullfils once all the urls have been processed
//If all the urls fail to be added, will throw an error
module.exports.addFacesToPersonAsync=(personGroupId,personId,faceUrls)=>{

	return new Promise(async (resolve,reject)=>{

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

	  resolve(addedFacesCount);

	});
}


module.exports.trainPersonGroupAsync=(personGroupId)=>{

	let options={
		method: 'POST',
		url: 'https://'+config.COGNITIVE_LOCATION+'.'+config.COGNITIVE_BASE_ROUTE+'/persongroups/'+personGroupId+'/train',
    headers:{'Ocp-Apim-Subscription-Key':config.COGNITIVE_SUBS_KEY},

  }
  return rp(options);
}

async function setupPerson(){

	let personGroupId= "RinconCaicedo";
	let personGroup_display_name="Familia Rincon Caicedo";
	let person_display_name = "Ruben";
	let facesurls=['a','b','c'];
	

	try{

		//create group
		await createPersonGroupAsync(personGroupId,personGroup_display_name);

		//add person to group
		let personID = await addPersonToPersonGroupAsync(personGroupId,person_display_name);

		//add faces to person
		await addFacesToPersonAsync(personGroupId,personID,facesUrls);

		//train group

		await trainPersonGroupAsync(personGroupId);

	}catch(error){
		console.log(error);
	}

}


//https://[location].api.cognitive.microsoft.com/face/v1.0/persongroups/{personGroupId}

function createPersonGroupAsync(personGroupId,displayName){

	let options={
		method: 'POST',
		url: 'https://'+config.COGNITIVE_LOCATION+'.'+COGNITIVE_PERSONGROUPS_ROUTE+'/persongroups/'+personGroupId,
    headers:{"Ocp-Apim-Subscription-Key":COGNITIVE_SUBS_KEY},
    json: true ,
    body: {"name":displayName}
  }

  return rp(options);

}



/*
Returns all the faces from a personGroup on a picture
The returned value is a promise that will return an array of personIds
path is passed simply as a reference as photoURL is normally a temporary link
*/
module.exports.detectPersonsInPhotoAsync =async (personGroupId,photoURL,path)=>{

  return new Promise(async(resolve,reject)=>{
  	
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
	    if(!faceIds || faceIds.length==0) return resolve();

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
			if(cleanedPersonIds.length==0) return resolve();


			//Return tags along the path of the picture
			resolve({
				personIds:cleanedPersonIds,
				path:path
			});

	 	 }catch(error){
				reject(new Error("Error detecting person in photo. "+error.message));
		}
  });
}


//Add a person to the group
function addPersonToPersonGroupAsync(personGroupId,displayName){
		let options={
		method: 'POST',
		url: 'https://'+config.COGNITIVE_LOCATION+'.'+COGNITIVE_PERSONGROUPS_ROUTE+'/persongroups/'+personGroupId+'/persons',	
    headers:{"Ocp-Apim-Subscription-Key":COGNITIVE_SUBS_KEY},
    json: true ,
    body: {"name":displayName}
  }

  return rp(options);

}

//Add faces to the person
function addFacesToPersonAsync(personGroupId,personID,facesUrls){

  var promises = [];

	let options={
		method: 'POST',
		url: 'https://'+config.COGNITIVE_LOCATION+'.'+COGNITIVE_PERSONGROUPS_ROUTE
				+'/persongroups/'+personGroupId+'/persons/'+personID+'persistedFaces',	
    headers:{"Ocp-Apim-Subscription-Key":COGNITIVE_SUBS_KEY},
    json: true ,
  }
  
  //Create a promise for each path and push it to an array of promises
  facesUrls.forEach((url)=>{
    options.body = {'url':url};
    promises.push(rp(options));
  });

  //returns a promise that fullfills once all the promises in the array complete or one fails
  return Promise.all(promises);

}


function trainPersonGroupAsync(personGroupId){

	let options={
		method: 'POST',
		url: 'https://'+config.COGNITIVE_LOCATION+'.'+COGNITIVE_PERSONGROUPS_ROUTE+'/persongroups/'+personGroupId+'/train',
    headers:{"Ocp-Apim-Subscription-Key":COGNITIVE_SUBS_KEY},
  }

  return rp(options);

}




















