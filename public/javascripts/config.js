$(function() {

	//Adding a new face actions
	$( "#button-new-face").click( 
		()=> {
			let path = $("#input-new-face-path").val();
			let search_name = $("#input-new-face-search-name").val();

			let data={
				event: 'add_face',
				search_name: search_name,
				path: path
			}

			updateSettings(data,
				(error,response)=>{
					showAndHideMessage(error,$('#faces-message'),"Success adding face");
					if(!error && response) $("#face-list").append($("<li>").text(response));
			});
		});


	//Updating photos path
	$("#button-change-photos-path").click(
		()=>{
			let path = $("#input-photos-path").val();
			let data={
				event: 'update_path',
				path: path
			}

			updateSettings(data,
				(error,response)=>{
					showAndHideMessage(error,$('#tagging-message'),"Success changing path");
			});
		});

	//Tagging pictures actions
	$( "#button-tag-all").click(
		()=>{
			tag('tag_all');
		});

	$( "#button-tag-partial").click(
		()=>{
			tag('tag_partial');
		});
});

function tag(tagging_type){
	let data={
		event: tagging_type
	}

	updateSettings(data,
		(error,response)=>{
			showAndHideMessage(error,$('#tagging-message'),"Success tagging photos");
			if(!error && response) $("#last-modified").text(response);

		});
}

function updateSettings(data,callback){
	$('button').prop('disabled', true);
	
	$.ajax({
   
   url: '/settings',
   type: 'PUT',
   data: data,
   success: (response)=>{
   	callback(null,response);
   },
   error: (jqXHR)=>{
   	callback(new Error("Couldn't update settings: "+jqXHR.responseText));
   },
   complete: (jqXHR,textStatus)=>{
		$('button').prop('disabled', false);
   }
	});
}

function showAndHideMessage(error, object, success_message){

	let message = error?error.message:success_message;

	//Display message as an error or success
	object.text(message);
	let attr_class = error? 'error':'success';
	object.attr('class', attr_class);

	//show and hide for 5 seconds
	object.show();
	setTimeout(function() { object.hide(); }, 5000);
}