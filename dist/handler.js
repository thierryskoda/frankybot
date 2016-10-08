(function(e, a) { for(var i in a) e[i] = a[i]; }(exports, /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	/*/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\
	 /  Global
	 /\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\*/

	if (process.env.NODE_ENV == 'development' || process.env.NODE_ENV === undefined) {
	  __webpack_require__(1).config();
	}

	var emoji = __webpack_require__(2);
	var requestPromise = __webpack_require__(3);

	var Twilio = __webpack_require__(4);
	var isTesting = false;
	var accountSid = isTesting ? process.env.TWILIO_TEST_ACCOUNT_SID : process.env.TWILIO_ACCOUNT_SID;
	var authToken = isTesting ? process.env.TWILIO_TEST_AUTH_TOKEN : process.env.TWILIO_AUTH_TOKEN;
	var myTwilioNumber = isTesting ? '+15005550006' : process.env.TWILIO_NUMBER;
	var clientTwilio = new Twilio.RestClient(accountSid, authToken);

	var Trello = __webpack_require__(5);
	var clientTrello = new Trello(process.env.TRELLO_API_KEY, process.env.TRELLO_API_TOKEN);
	var toDoListId = '568b0ee37f2c08057a8ea6fc';
	var thierryBoardId = '568b0ed71d8239e63f6dbc55';

	var weatherApiUrl = 'http://api.openweathermap.org/data/2.5';

	/*/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\
	 /  Lambda function handlers
	 /\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\*/
	module.exports.hello = function (event, context, cb) {
	  return cb(null, { message: 'Go Serverless v1.0! Your function executed successfully!', event: event });
	};

	module.exports.receiveMessage = function (event, context, cb) {
	  var messageAction = event.body.Body.split(' ')[0];
	  var messageBody = event.body.Body.substr(event.body.Body.indexOf(' ') + 1);

	  // Evaluate the action
	  switch (messageAction.toLowerCase()) {
	    case 'trello':
	      if (messageBodyIsInvalid(messageBody)) return sendTwilioMessage(event.body.From, 'No title to your trello card ? ' + emoji.get('thinking_face'));
	      addTrelloCard(messageBody).then(sendTwilioMessage(event.body.From, 'Your card has been added ' + emoji.get('relieved') + emoji.get('notebook')));
	      break;
	    // case 'weather':
	    //   console.log("Get weather");
	    //   getCurrentWeatherFor(messageBody.split(' ')[0])
	    //   .then(formatWeatherResponse)
	    //   .then((formatedWeather) => {
	    //     sendTwilioMessage(event.body.From, formatedWeather);
	    //   })
	    //   .catch((err) => {
	    //       console.error("ERROR:", err);
	    //   })
	    //   break;
	    case 'actions':
	      sendTwilioMessage(event.body.From, 'All actions possible are: \'trello\' ' + emoji.get('punch'));
	      break;
	    default:
	      sendTwilioMessage(event.body.From, 'Wrong action. I can\'t understand ' + emoji.get('disappointed') + emoji.get('thumbsdown'));
	      break;
	  };

	  cb(null, { message: "Twilio message well received!", status: 200 });
	};

	/*/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\
	 /  Public functions
	 /\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\*/
	function formatWeatherResponse(weatherObject) {
	  var weatherCode = weatherObject.weather[0].id;
	  var emojiWeather = 'question';

	  switch (true) {
	    case weatherCode >= 200 && weatherCode <= 299:
	      emojiWeather = 'thunder_cloud_and_rain';
	      break;
	    case weatherCode >= 300 && weatherCode <= 399:
	      emojiWeather = 'rain_cloud';
	      break;
	    case weatherCode >= 500 && weatherCode <= 599:
	      emojiWeather = 'rain_cloud';
	      break;
	    case weatherCode >= 600 && weatherCode <= 699:
	      emojiWeather = 'snow_cloud';
	      break;
	    case weatherCode == 800:
	      emojiWeather = 'sunny';
	      break;
	    case weatherCode == 801:
	      emojiWeather = 'sun_small_cloud';
	      break;
	    case weatherCode == 802:
	      emojiWeather = 'sun_behind_cloud';
	      break;
	    case weatherCode == 803 || weatherCode == 804:
	      emojiWeather = 'cloud';
	      break;
	    case weatherCode == 801 && weatherCode <= 899:
	      emojiWeather = 'rain_cloud';
	      break;
	  }

	  return 'It is currently ' + Math.floor(weatherObject.main.temp - 273.15) + '\xBAC in ' + weatherObject.name + ' with ' + weatherObject.weather[0].description + ' ' + emoji.get(emojiWeather) + ' and there\'s ' + weatherObject.clouds.all + '% of clouds in the sky ' + emoji.get('koala');
	}

	function getCurrentWeatherFor(city) {
	  return requestPromise.get(weatherApiUrl + '/weather/?q=' + city + '&APPID=' + process.env.WEATHER_API_KEY).then(function (result) {
	    resolve(JSON.parse(result));
	  }).catch(function (err) {
	    reject(JSON.parse(err));
	  });
	}

	function messageBodyIsInvalid(message) {
	  return !message || message == '' || message == ' ' || message == 'trello';
	}

	function addTrelloCard(cardTitle) {
	  var cardDescription = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';

	  return clientTrello.addCard(cardTitle, cardDescription, toDoListId);
	}

	function sendTwilioMessage(to, text) {
	  clientTwilio.messages.create({
	    body: text,
	    to: to,
	    from: myTwilioNumber
	  }, function (err, message) {
	    if (err) {
	      console.log("ERROR:", err);
	    } else {
	      console.log("Success sending message :", message.body);
	    }
	  });
	}

/***/ },
/* 1 */
/***/ function(module, exports) {

	module.exports = require("dotenv");

/***/ },
/* 2 */
/***/ function(module, exports) {

	module.exports = require("node-emoji");

/***/ },
/* 3 */
/***/ function(module, exports) {

	module.exports = require("request-promise");

/***/ },
/* 4 */
/***/ function(module, exports) {

	module.exports = require("twilio");

/***/ },
/* 5 */
/***/ function(module, exports) {

	module.exports = require("trello");

/***/ }
/******/ ])));
