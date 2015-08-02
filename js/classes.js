
/*	Global Variables	*/
var DROPDOWN_ID = 0;
var YOUTUBE_USER_URL = "https://www.youtube.com/user/";

/*	Public Classes	*/
function $videoUI(id)
{
	var sort_expression = "date";
	var next_page_token = "";
	var location_latitude = "";
	var location_longitude = "";
	var location_radius = "";

	this.Element = document.createElement("div");
	this.Element.className = "class-video-ui";

	var video = new $videoplayer();

	var results = new $listpagination("Videos");
	results.style = "width:400px;margin:10px;";
	results.itemselected = function(d)
	{
		video.setVideo(d, false);
	};
	results.showmore = function(){
		nextPage();
	};

	//	Search 
	node = document.createElement("div");
	_setStyle(node, "padding:10px;");

	var search_text = new $inputtext(); 
	search_text.style = "width:80%";
	node.appendChild(search_text.Element);

	var search_button = new $inputbutton("Search");
	search_button.style = "width:100px;height:30px;margin-left:5px;";
	search_button.clicked = function(){
		setSearch();
	};
	node.appendChild(search_button.Element);
	this.Element.appendChild(node);

	//	Sort and Filter
	var tools = document.createElement("div");
	_setStyle(tools,"text-align:left;margin-top:5px;padding-left: 10px;");

	var filter = new $dropdown(["None","By Location (10 miles)", "By Location (50 miles)", "By Location (100 miles)"], "Filter");
	filter.style = "margin-right:5px;width:150px";
	filter.selectionchanged = function(s){

		if(s == "None")
		{
			location_latitude = "";
			location_longitude = "";
			location_radius = "";
			setSearch();
		}
		else
		{
			_getLocation(function(position){
				location_latitude = position.coords.latitude;
				location_longitude = position.coords.longitude;
				if(s == "By Location (10 miles)")
				{
					location_radius = "10mi";
				}
				else if(s == "By Location (50 miles)")
				{
					location_radius = "50mi";
				}	
				else if(s == "By Location (100 miles)")
				{
					location_radius = "100mi";
				}

				setSearch();
			});

		}	
	};
	tools.appendChild(filter.label);
	tools.appendChild(filter.Element);

	var sort = new $dropdown(["Sort by Date", "Sort by Rating", "Sort by Relevance"], "Sort");
	sort.selectionchanged = function(s){

		if(s == "Sort by Date")
		{
			sort_expression = "date";
		}
		else if(s == "Sort by Rating")
		{
			sort_expression = "rating";
		}
		else if(s == "Sort by Relevance")
		{
			sort_expression = "relevance";
		}
		setSearch();

	};
	tools.appendChild(sort.label);
	tools.appendChild(sort.Element);

	//	Video Player and results
	var table = document.createElement("div");
	table.className = "class-table";

	var row = document.createElement("div");
	row.className = "class-row";

	var left_cell = document.createElement("div");
	left_cell.className = "class-cell";

	var right_cell = document.createElement("div");
	right_cell.className = "class-cell";

	row.appendChild(left_cell);
	row.appendChild(right_cell);
	table.appendChild(row);

	left_cell.appendChild(video.Element);
	right_cell.appendChild(tools);
	right_cell.appendChild(results.Element);
	this.Element.appendChild(table);

	//	Add video UI to the parent node  
	var parent = document.getElementById(id);
	parent.appendChild(this.Element);

	//	set focus on search text
	search_text.focus();

	//	Load favorites videos from storage list
	video.loadFavorites();

	//	Private Methods
	function setSearch()
	{
		next_page_token = "";
		results.reset();
		results.pagination(false);
		search();
	}

	function nextPage()
	{
		search();
	}

	function search()
	{

		var text  = search_text.getText();
		var request = null;
		if(location_radius == "")
		{
			request = gapi.client.youtube.search.list({
				q: text,
				type:"video",
				order:sort_expression,
				pageToken:next_page_token,
				part: 'snippet'
			});
		}
		else
		{
			var location = location_latitude +"," + location_longitude;
			request = gapi.client.youtube.search.list({
				q: text,
				order:sort_expression,
				type:"video",
				location:location,
				locationRadius:location_radius,
				pageToken:next_page_token,
				part: 'snippet'
			});
		}	

		request.execute(function(response) {

			if(response.result == undefined)
			{
				alert("An Error occurred while requesting the video list, try it later");
				return;
			}	
			
			
			next_page_token = response.result.nextPageToken;

			for(var i=0;  i < response.items.length ;i++) results.addItem(new $videoitem(response.items[i], false));

			if(response.items.length > 0)
			{
				results.pagination(true);
			}
		});
	}

	//	Private classes
	function $videoplayer()
	{
		var data = null;
		var This = this;
		var comment_index = 0;
		var comments_page = 10;
		var comments_list = null;

		this.Element = document.createElement("div");
		this.Element.className = "class-video-player-box";

		var favorites = new $foldinglist("Favorites", true);
		favorites.style = "width:560px;margin-left:5px;";
		favorites.itemselected = function(d){
			This.setVideo(d, true);
		};
		favorites.itemremoved = function(d){
			removeFromFavorites(d);
		};
		favorites.postreset = function(){
			//	clean up session storage
			sessionStorage.removeItem("favoritelist");
		};

		var video  = document.createElement("iframe");
		video.className = "class-video-player-link";

		var meta = document.createElement("div");
		meta.className = "class-video-player-meta";
		meta.style.display = "none";

		var title = document.createElement("div");
		title.className = "class-video-player-title";

		var detail = document.createElement("div");
		detail.className = "class-video-player-detail";

		var rating = document.createElement("div");
		rating.className = "class-video-player-rating";

		var add_button = new $inputbutton("Add to Favorites");
		add_button.clicked = function(){
			addToFavorites();
		};

		meta.appendChild(add_button.Element);
		meta.appendChild(title);
		meta.appendChild(detail);
		meta.appendChild(rating);

		var comments = new $listpagination("Comments(0)");
		comments.style = "width:560px;margin-top:10px;margin-left:5px;";
		comments.showmore = function(){
			nextComments();
		};

		this.Element.appendChild(favorites.Element);
		this.Element.appendChild(video);
		this.Element.appendChild(meta);
		this.Element.appendChild(comments.Element);

		//	Methods
		this.loadFavorites = function()
		{
			loadFavorites();
		};

		this.setVideo = function(d, favo){
			favorites.collapse();
			_removeChildren(rating);
			comments.reset();
			comments.setTitle("Comments(0)");
			data = d;
			meta.style.display = "block";
			title.innerHTML =  data.snippet.title;
			detail.innerHTML =  "<br><span>Published: "+ new Date(data.snippet.publishedAt) + "</span><br>" +
			"<span>Channel: " +  data.snippet.channelTitle + "</span><br><br><span>" + data.snippet.description + "</span>";
			video.src = "http://www.youtube.com/embed/"+ data.id.videoId +"?autoplay=1";
			commnet_next_page_token = "";
			comment_count = 0;
			comment_index = 0;
			comments_list = [];
			comments.pagination(false);
			getVideoInfo();
		};

		function getVideoInfo()
		{
			
			request = gapi.client.youtube.videos.list({
				id: data.id.videoId,
				part:"statistics"
			});
			request.execute(function(response) {
				getComments();
				if(response)
				{
					if(response.items.length > 0)
					{
						var rate = document.createElement("div");
						rate.className = "class-video-rate-view-count";
						rate.innerHTML = response.items[0].statistics.viewCount; 
						rating.appendChild(rate);
						
						rate = document.createElement("div");
						rate.className = "class-video-rate-like-count";
						rate.innerHTML = response.items[0].statistics.likeCount; 
						rating.appendChild(rate);
						
						rate = document.createElement("div");
						rate.className = "class-video-rate-dislike-count";
						rate.innerHTML = response.items[0].statistics.dislikeCount; 
						rating.appendChild(rate);
					}	
				}	

			});
		}
		
		//	Private Methods
		function getComments()
		{
			var request = new $request();
			request.responseReady = function(text){
				var tmp = JSON.parse(text);
				if(tmp.feed != undefined)
				{	
					
					if(tmp.feed.entry != undefined)
					{	
						comments_list = tmp.feed.entry;
						comments.setTitle("Comments("+ comments_list.length + ")");
						if(comments_list.length > comments_page) comments.pagination(true);
						nextComments();
					}
				}
				
			};
			request.execute("http://gdata.youtube.com/feeds/api/videos/" + data.id.videoId + "/comments?v=2&alt=json&max-results=50","GET");
		}

		function nextComments()
		{
			if(comment_index > comments_list.length) return;

			var cnt = 1;
			var  i = 0; 
			for(i = comment_index ; i < comments_list.length ; i++)
			{
				var cmt = new $comment(comments_list[i]);
				comments.addItem(cmt);
				if(cnt == comments_page) break;
				cnt++;
			}
			comment_index = i + 1;

			if(comment_index > comments_list.length) comments.pagination(false);
		}

		function $comment(d)
		{
			this.Element = document.createElement("div");
			this.Element.className = "class-comment-item";

			var left = document.createElement("div");
			left.className = "class-cell";

			var pic = document.createElement("div");
			pic.className = "class-comment-pic";

			var right = document.createElement("div");
			right.className = "class-cell";

			var panel = document.createElement("div");

			var author = document.createElement("div");
			author.className = "inline-element class-comment-author class-link";
			if(d.author.length > 0) 
			{
				author.innerHTML = d.author[0].name.$t;
				author.userid = d.author[0].name.$t;
				author.onclick = function(){
					window.open(YOUTUBE_USER_URL + this.userid);
				};

				pic.userid = d.author[0].name.$t;
				pic.onclick = function(){
					window.open(YOUTUBE_USER_URL + this.userid);
				};
			}

			var date = document.createElement("div");
			date.className = "inline-element class-comment-date";
			date.innerHTML = new Date(d.published.$t);

			var content = document.createElement("div");
			content.className = "class-comment-content";
			content.innerHTML = d.content.$t;

			var replies = document.createElement("div");
			replies.className = "class-comment-replies";

			var reply_cnt = document.createElement("div");
			reply_cnt.className = "class-link"; 
			reply_cnt.innerHTML = "Replies: " + d.yt$replyCount.$t; 

			replies.appendChild(reply_cnt);

			left.appendChild(pic);

			panel.appendChild(author);
			panel.appendChild(date);
			panel.appendChild(content);
			panel.appendChild(replies);

			right.appendChild(panel);

			this.Element.appendChild(left);
			this.Element.appendChild(right);
		}

		function loadFavorites()
		{
			var list = sessionStorage.getItem("favoritelist");

			if(list != null) 
			{	
				list = JSON.parse(list);
				for(var i=0; i < list.length ;i++)
				{
					addFavoriteItem(list[i]);	
				}
			}
		}

		function addToFavorites()
		{
			if(data !=null)
			{
				var search = searchFavorite(data.id.videoId);

				if(search.index == -1) 
				{
					search.list.push(data); 
					sessionStorage.setItem("favoritelist", JSON.stringify(search.list));
					//	Add to list
					addFavoriteItem(data);
				}
			}	
		}

		function removeFromFavorites(d)
		{
			var search = searchFavorite(d.id.videoId);

			if(search.index > -1) 
			{
				search.list.splice(search.index, 1);
				sessionStorage.setItem("favoritelist", JSON.stringify(search.list));
			}	
		}

		function searchFavorite(id)
		{
			var list = sessionStorage.getItem("favoritelist");

			if(list == null) 
			{
				list = [];
			}
			else
			{	
				list = JSON.parse(list);
			}

			for(var i=0; i < list.length ;i++)
			{
				if(list[i].id.videoId == id) return {index:i,list:list};
			}

			return {index:-1,list:list};;
		}

		function addFavoriteItem(d)
		{
			var item = new $videoitem(d, true);
			favorites.addItem(item);
		}
	}


	function $videoitem(data, close)
	{

		var This = this;
		this.Element = document.createElement("div");
		this.Element.className = "class-video-list-item";

		this._parent = null;

		this.Element.onclick = function(){
			if(This._parent!=null) 
			{
				This._parent.itemselected(data);
				This._parent._itemselected(data);
			}
		};

		var cell = document.createElement("div");
		cell.className = "class-cell";

		var video = document.createElement("div");
		video.className = "class-video-list-video";
		video.style["background-image"] = "url(" + data.snippet.thumbnails["default"].url +")";

		cell.appendChild(video);
		this.Element.appendChild(cell);

		var details =  document.createElement("div");
		details.className = "class-video-list-details";

		var title =  document.createElement("div");
		title.className = "class-video-list-title";
		title.innerHTML = data.snippet.title;
		details.appendChild(title);

		var date =  document.createElement("div");
		date.className = "class-video-list-subtitle";
		date.innerHTML = "Published: "+ new Date(data.snippet.publishedAt);
		details.appendChild(date);

		cell = document.createElement("div");
		cell.className = "class-cell";

		cell.appendChild(details);

		if(close == true)
		{
			var del = document.createElement("div");
			del.className = "class-close-item";
			del.title = "remove";
			del.onclick = function(e){
				_stopEvent(e);
				if(This.Element.parentNode != undefined)  This.Element.parentNode.removeChild(This.Element);
				if(This._parent!=null) 
				{
					This._parent.itemremoved(data);
					This._parent._itemremoved();
				}
			};
			details.appendChild(del);
		}	

		this.Element.appendChild(cell);
	}

}


function $dropdown(list, label)
{
	var This = this;
	$object.call(this);

	DROPDOWN_ID++;
	var id = "_ddlb" + DROPDOWN_ID;

	this.Element = document.createElement("select");
	this.Element.className = "class-dropdown";
	this.Element.id = id; 
	this.Element.onchange = function(e){
		This.selectionchanged(this.value);
	};

	this.label = document.createElement("label");
	this.label.innerHTML = label;
	this.label.setAttribute("for", id);
	if(label != undefined) _setStyle(this.Element, "margin-left:5px");  

	//	Load List
	for(var i=0; i < list.length ;i++) 
	{
		var op = document.createElement("option");
		op.value = list[i];
		op.innerHTML = list[i];
		this.Element.appendChild(op);
	}

	//	Events
	this.selectionchanged = function(s){};

}

function $foldinglist(text, clear)
{
	var This = this;
	$object.call(this);
	this.Element = document.createElement("div");
	this.Element.className = "class-object class-folding-list";

	var remove = null;

	var header = document.createElement("div");
	header.className = "class-folding-list-title class-folding-list-title-collapsed";
	header.expanded = false;
	header.onclick = function(){
		if(this.expanded == false)
		{
			this.expanded = true;
			this.className = "class-folding-list-title class-folding-list-title-expanded";
			list.style.display = "block";
		}
		else
		{
			this.expanded = false;
			this.className = "class-folding-list-title class-folding-list-title-collapsed";
			list.style.display = "none";
		}	

	};

	var title = document.createElement("span"); 	
	title.innerHTML = text + "(0)";
	header.appendChild(title);

	var node = document.createElement("div");
	_setStyle(node, "width:100%;height:100%;overflow-x:auto");

	var list = document.createElement("div");
	list.className = "class-table";
	_setStyle(list,"width:100%;display:none");
	node.appendChild(list);

	if(clear == true)
	{
		remove = new $inputbutton("Clear");
		remove.style = "margin-left:25px";
		remove.enabled = false;
		remove.clicked = function(){
			This.reset();
			postreset();
		};
		header.appendChild(remove.Element);
	}	

	this.Element.appendChild(header);
	this.Element.appendChild(node);

	//	Events
	this.itemselected = function(value){};
	this._itemselected = function(){ collapse();};

	this.itemremoved = function(data){};
	this._itemremoved = function(){

		if(remove == null) return;

		if(list.childNodes.length == 0)
		{
			remove.enabled = false;
			collapse();
		}
		else
		{
			remove.enabled = true;
		}	

		title.innerHTML = text + "("+ list.childNodes.length +")";
	};

	// Methods
	this.addItem = function(item){
		item._parent = this;
		list.appendChild(item.Element);
		if(remove != null) remove.enabled = true;
		title.innerHTML = text + "("+ list.childNodes.length +")";
	};

	this.reset = function(){
		_removeChildren(list);
		title.innerHTML = text + "(0)";
	};

	this.collapse = function(){collapse();};

	//	Events
	this.showmore = function(){};
	this.postreset = function(){};

	//	Private Methods
	function postreset()
	{
		This.postreset();
		if(remove != null) remove.enabled = false;
		collapse();
	}

	function collapse()
	{
		header.expanded = false;
		header.className = "class-folding-list-title class-folding-list-title-collapsed";
		list.style.display = "none";
	}
}

function $listpagination(title)
{
	var This = this;
	$object.call(this);
	this.Element = document.createElement("div");
	this.Element.className = "class-object class-list-pagination";

	var title_text = document.createElement("div");
	title_text.className = "class-list-pagination-title";
	title_text.innerHTML = title;

	var list = document.createElement("div");
	list.className = "class-table";
	_setStyle(list, "padding-top:10px;width:100%");

	var show_more = document.createElement("div");
	show_more.className = "class-list-show-more";
	show_more.innerHTML = "show more";
	show_more.style.display = "none";
	show_more.onclick = function(){
		This.showmore();
	};

	this.Element.appendChild(title_text);
	this.Element.appendChild(list);
	this.Element.appendChild(show_more);

	//	Events
	this._itemselected = function(){};
	this.itemselected = function(value){};
	this._itemremoved = function(){};
	this.itemremoved = function(value){};

	//	Methods
	this.setTitle = function(text){
		title_text.innerHTML = text;
	};

	this.addItem = function(item){
		item._parent = this;
		list.appendChild(item.Element);
	};

	this.pagination = function(b){
		show_more.style.display =  b==true?"block":"none";
	};

	this.reset = function(){
		_removeChildren(list);
	};

	//	Events
	this.showmore = function(){

	};
}

function $inputtext()
{
	$object.call(this);
	this.Element = document.createElement("input");
	this.Element.type = "text";
	this.Element.className = "class-input-text";

	// Methods
	this.getText = function(){ return this.Element.value;};
}

function $inputbutton(text)
{	
	$object.call(this);
	var This = this;
	this.Element = document.createElement("input");
	this.Element.type = "button";
	this.Element.className = "class-input-button";
	this.Element.value = text;
	this.Element.onclick = function(e){ _stopEvent(e); This.clicked();};

	//	Events
	this.clicked = function(){};
}

function $object()
{
	var This = this;
	this.Element = document.createElement("div");

	this.style = "";
	this.enabled = true;
	_listenProperty(this,"style,enabled",_set);

	this.focus = function(){
		this.Element.focus();
	};

	function _set(p,v)
	{
		if(p == "style")
		{	
			_setStyle(This.Element, v);
		}
		else if(p == "enabled")
		{
			This.Element.disabled = !v;
		}	
	};
}

function $request()
{
	var This = this;
	var reqxml = _getRequest();
	this.contenttype = "application/x-www-form-urlencoded";

	this.responseReady = function(t){};

	this.execute = function(url, type)
	{
		if(reqxml != undefined) 
		{

			reqxml.onreadystatechange = function()
			{
				if (reqxml.readyState == 4) 
				{
					if (reqxml.status == 200) 
					{

						This.responseReady(reqxml.responseText);
					}
				}
			};
			if(type == "GET")
			{
				reqxml.open("GET", url, true);
				reqxml.setRequestHeader("Content-Type", This.contenttype);
				reqxml.send(null);

			}	
			else if(type == "POST")
			{
				reqxml.open("POST", url, asyn);
				reqxml.setRequestHeader("Content-Type",This.contenttype);
				reqxml.send(args);
			}	

		}
	};

}

