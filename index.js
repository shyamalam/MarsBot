// Reference the packages we require so that we can use them in creating the bot
var restify = require('restify');
var builder = require('botbuilder');
var rp = require('request-promise');
var BINGSEARCHKEY = '5b47cc39f70045b583b960cf59e51b7e';

//=========================================================
// Bot Setup
//=========================================================

// Setup Restify Server
// Listen for any activity on port 3978 of our local server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
   console.log('%s listening to %s', server.name, server.url); 
});
  
// Create chat bot
var connector = new builder.ChatConnector({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
});
var bot = new builder.UniversalBot(connector);
// If a Post request is made to /api/messages on port 3978 of our local server, then we pass it to the bot connector to handle
server.post('/api/messages', connector.listen());

//=========================================================
// Bots Dialogs
//=========================================================

// This is called the root dialog. It is the first point of entry for any message the bot receives
var luisRecognizer = new builder.LuisRecognizer('https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/a9fbf9c5-a393-41e1-969c-595f2f1686b8?subscription-key=0a87682896924685b907806199be5e48&staging=true&timezoneOffset=0.0&verbose=false&q=');
var intentDialog = new builder.IntentDialog({recognizers: [luisRecognizer]});
bot.dialog('/', intentDialog);

intentDialog.matches(/\b(hi|hello|hey|howdy)\b/i, '/sayHi') //Check for greetings using regex
	.matches('GoogleSearch', '/googleImages') //Check for LUIS intent to image search
    .matches('GetNews', '/topNews') //Check for LUIS intent to get news
	.matches (/\b(dingus)\b/i,'/xd') //haha xd
    .onDefault(builder.DialogAction.send("Sorry, I didn't understand what you said.")); //Default message if all checks fail


bot.dialog('/xd', function(session){
	session.send("well memed sir dx");
	session.endDialog();
});
	
bot.dialog('/sayHi', function(session) {
    session.send('Hi there!  Try saying things like "Get news in Toyko"');
    session.endDialog();
});
bot.dialog('/googleImages', function(session) {
	imageSearch(session);
	session.endDialog();
});
bot.dialog('/topNews', [
    function (session){
        // Ask the user which category they would like
        // Choices are separated by |
        builder.Prompts.choice(session, "Which category would you like?", "Technology|Science|Sports|Business|Entertainment|Politics|Health|World|(quit)");
    }, function (session, results){
        if (results.response && results.response.entity !== '(quit)') {
            //Show user that we're processing their request by sending the typing indicator
            session.sendTyping();
            // Build the url we'll be calling to get top news
            var url = "https://api.cognitive.microsoft.com/bing/v5.0/news/?" 
                + "category=" + results.response.entity + "&count=10&mkt=en-US&originalImg=true";
			// Build options for the request
			var options = {
				uri: url,
				headers: {
					'Ocp-Apim-Subscription-Key': BINGSEARCHKEY
				},
				json: true // Returns the response in json
			}
			
			rp(options).then(function(body){
				// The request is successful
				sendTopNews(session, results, body);
			}).catch(function (err){
				// An error occurred and the request faied
				console.log(err.message);
				session.send("Argh, something went wrong. :( Try again?");
			}).finally( function(){
				// always executes
				session.endDialog();
			});
        } else {
            session.endDialog("Ok. Mission Aborted.");
        }
    }
]);

// function processes results form API and sends them as cards
function sendTopNews (session, results, body){
	session.send("Top news in " + results.response.entity + ": ");
	// show user that we're processing
	session.sendTyping();
	// the value property in body contains an array of returned articles
	var allArticles = body.value;
	var cards = [];
	// iterate through all 10 articles returned by API
	for (var i = 0; i < 10; i++){
		var article = allArticles[i];
		cards.push(new builder.HeroCard(session)
			.title(article.name)
			.subtitle(article.datePublished)
			.images([
				// handle iff thumbnail is empty
				builder.CardImage.create(session, article.image.contentUrl)
			])
			.buttons([
				// pressing this button opens url to article
				builder.CardAction.openUrl(session, article.url, "Full article")
			]));
	}
	var msg = new builder.Message(session)
		.textFormat(builder.TextFormat.xml)
		.attachmentLayout(builder.AttachmentLayout.carousel)
		.attachments(cards);
	session.send(msg);
}


function imageSearch (session){
	// show user that we're processing
	session.sendTyping();
	// the value property in body contains an array of returned articles
	var cards = [];
	// iterate through all 10 articles returned by API
		var url = "https://www.google.ca/search?q=google+images&source=lnms&tbm=isch&sa=X&ved=0ahUKEwi5_JqW6PPSAhVH1oMKHQKBAkgQ_AUICCgB&biw=1175&bih=616#tbm=isch&q=puppies";
		cards.push(new builder.HeroCard(session)
			.title("yay")
			.subtitle("doggo")
			.buttons([
				// pressing this button opens url to article
				builder.CardAction.openUrl(session, url, "Fluffer time")
			]));
	
	var msg = new builder.Message(session)
		.textFormat(builder.TextFormat.xml)
		.attachmentLayout(builder.AttachmentLayout.carousel)
		.attachments(cards);
	session.send(msg);
}

