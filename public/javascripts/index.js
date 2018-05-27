$(function() {

	//logic to hide and show the gallery-list and the settings 
	$("#settings").hide();
	$("#button-settings").click(
		()=>{
			$("#settings").show();
			$("#gallery-list").hide();
		}
	);
	$("#button-gallery-list").click(
		()=>{
			$("#settings").hide();
			$("#gallery-list").show();
		}
	);

	//Adding a new face actions
	$( "#button-new-face").click( 
		()=> {
			let path = $("#input-new-face-path").val();
			let search_name = $("#input-new-face-search-name").val();

			//if any empty field, display error message
			if(!path || !search_name) return showAndHideMessage(new Error('correct any empty fields'),$('#faces-message'));

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

			//if any empty field, display error message
			if(!path) return showAndHideMessage(new Error('correct any empty fields'),$('#change-path-message'));

			let data={
				event: 'update_path',
				path: path
			}

			updateSettings(data,
				(error,response)=>{
					showAndHideMessage(error,$('#change-path-message'),"Success changing path");
					if(!error)$("#photos-path").text(path);
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
	let attr_class = error? 'alert alert-danger':'alert alert-success';
	object.attr('class', attr_class);

	//show and hide for 5 seconds
	object.show();
	setTimeout(function() { object.hide(); }, 7000);
}