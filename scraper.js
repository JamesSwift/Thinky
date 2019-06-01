/*
	This file listens to a list of URLs that users request
	and creates a cached version of them. The web server will
	then serve the cached version next time the URL is loaded.
	
	This has no real impact on normal users, but lets search
	engines see the actual page content.

	It's a bit messy, but it works.
	
*/

const viewsList = "cache/cachedViews.json";
const cachedSession = "cache/cachedSession.json";
const cacheDir = "cache/views/";

var fs = require('fs');
var views = {};
var session = {};
try {
	views = JSON.parse(fs.readFileSync(viewsList, 'utf8'));
	session = JSON.parse(fs.readFileSync(cachedSession, 'utf8'));
} catch(err){}
var save = Object.assign({}, views);

if (!fs.existsSync(cacheDir)){
    fs.mkdirSync(cacheDir);
}


var jsSHA = require('./www/js/sha256.js');

//Find correct hostname
const user = require("os").userInfo().username;
var host = "https://www.example.com/";
if (user === "test"){
	host = "https://test.example.com/";
}


const jsdom = require("jsdom");
const { JSDOM } = jsdom;

const dom = new JSDOM(`
	<!DOCTYPE html><html><head>
		<script src="/js/utils.js"></script>
		<script src="/js/swdapi-client.min.js"></script>
		<script src="/js/sha256.js"></script>
		<script src="/js/inputValidator.js"></script>
		<script src="/js/controller.js"></script>
		<script src="/js/views-www/"></script>
	</head><body>
		<div id="content"></div>
		<div id="mask" class="display-none"></div>
		<div id="modals"></div>
		<div id="loading" class="display-none"></div>
		<script src="/js/headless.js"></script>
	</body></html>`, {
	url: host,
	runScripts: "dangerously",
	resources: "usable",
	pretendToBeVisual: true,
	beforeParse(window){
		window.localStorage = window.sessionStorage = {
			getItem: function (key) {
				return session[key];
			},
			setItem: function (key, value) {
				session[key] = value;
			},
			removeItem: function(key){
				delete session[key];
			}
		};
		
		window.scrollTo = function(){ return true; }
	}
});

const { window } = dom;

window.onload = function(){
	
	window.u.waitForObjects([ [window, "controller", "htmlDataPreloaded"] ], function(){
	
		var view, i, controller = window.controller;
		
		for (i in views){
			view = views[i];
			controller.getRenderedViewHTML(view.url, 
				saveView,
				deleteView
			);
		}
		
		window.setTimeout(saveThenClose, 5000);
		
	});
	
};

function saveView(url, title, html){
	
	var crypto = new jsSHA("SHA-256", "TEXT");
	crypto.update(url);
	var hash = crypto.getHash("HEX");
	
	//Update the DB
	save[hash] = {
		url: url,
		cached: Date.now(),
		file: cacheDir + hash + ".json"
	};
	
	fs.writeFile(cacheDir + hash + ".json", JSON.stringify({title: title, html: html}), 'utf8', function(err){
		if (err) throw err;
	});
}

function deleteView(url){
	
	var crypto = new jsSHA("SHA-256", "TEXT");
	crypto.update(url);
	var hash = crypto.getHash("HEX");
	
	delete save[hash];
	
}

function saveThenClose(){
	window.close();
	fs.writeFile(viewsList, JSON.stringify(save), 'utf8', function(err){
		if (err) throw err;
	});
	fs.writeFile(cachedSession, JSON.stringify(session), 'utf8', function(err){
		if (err) throw err;
	});
}
