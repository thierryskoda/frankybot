'use strict';

/*/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\
 /  Global
 /\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\*/
if(process.env.NODE_ENV == 'development' || process.env.NODE_ENV === undefined) {
  require('dotenv').config();
}

const emoji = require('node-emoji');
const requestPromise = require('request-promise');

const Twilio = require('twilio');
const isTesting = false;
const accountSid = (isTesting) ? process.env.TWILIO_TEST_ACCOUNT_SID : process.env.TWILIO_ACCOUNT_SID;
const authToken = (isTesting) ? process.env.TWILIO_TEST_AUTH_TOKEN : process.env.TWILIO_AUTH_TOKEN;
const myTwilioNumber = (isTesting) ? '+15005550006' : process.env.TWILIO_NUMBER;
const clientTwilio = new Twilio.RestClient(accountSid, authToken);

const Trello = require('trello');
const clientTrello = new Trello(process.env.TRELLO_API_KEY, process.env.TRELLO_API_TOKEN);
const toDoListId = '568b0ee37f2c08057a8ea6fc';
const thierryBoardId = '568b0ed71d8239e63f6dbc55';

const weatherApiUrl = 'http://api.openweathermap.org/data/2.5';



/*/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\
 /  Lambda function handlers
 /\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\*/
module.exports.hello = (event, context, cb) => cb(null,
  { message: 'Go Serverless v1.0! Your function executed successfully!', event }
);

module.exports.receiveMessage = (event, context, cb) => {
  const messageAction = event.body.Body.split(' ')[0];
  const messageBody = event.body.Body.substr(event.body.Body.indexOf(' ') + 1);

  // Evaluate the action
  switch(messageAction.toLowerCase()) {
    case 'trello':
      if(messageBodyIsInvalid(messageBody)) return sendTwilioMessage(event.body.From, `No title to your trello card ? ${emoji.get('thinking_face')}`);
      addTrelloCard(messageBody).then(sendTwilioMessage(event.body.From, `Your card has been added ${emoji.get('relieved')}${emoji.get('notebook')}`));
      break;
    case 'weather':
      getCurrentWeatherFor(messageBody.split(' ')[0])
      .then(formatWeatherResponse)
      .then((formatedWeather) => {
        sendTwilioMessage(event.body.From, formatedWeather);
      })
      .catch((err) => {
          console.error("ERROR:", err);
      })
      break;
    case 'actions':
      sendTwilioMessage(event.body.From, `All actions possible are: 'trello [CARD_TITLE]' ... 'weather [CITY]' ${emoji.get('punch')}`);
      break;
    default:
      sendTwilioMessage(event.body.From, `Wrong action. I can't understand ${emoji.get('disappointed')}${emoji.get('thumbsdown')}. All actions possible are: 'trello [CARD_TITLE]', 'weather [CITY]' ${emoji.get('punch')}`);
      break;
  };

  cb(null, {message: "Twilio message well received!", status: 200});
}



/*/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\
 /  Public functions
 /\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\*/
function formatWeatherResponse(weatherObject) {
  const weatherCode = weatherObject.weather[0].id;
  let emojiWeather = 'question';

  switch(true) {
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
    case weatherCode == 803 || weatherCode == 804:
      emojiWeather = 'cloud';
      break;
    case weatherCode == 801 && weatherCode <= 899:
      emojiWeather = 'rain_cloud';
      break;
  }

  return `It is currently ${Math.floor(weatherObject.main.temp - 273.15)}ºC in ${weatherObject.name} with ${weatherObject.weather[0].description} ${emoji.get(emojiWeather)} and there's ${weatherObject.clouds.all}% of clouds in the sky ${emoji.get('koala')}`
}

function getCurrentWeatherFor(city) {
  return requestPromise.get(`${weatherApiUrl}/weather/?q=${city}&APPID=${process.env.WEATHER_API_KEY}`)
  .then((result) => { return JSON.parse(result) })
  .catch((err) => { return JSON.parse(err) })
}

function messageBodyIsInvalid(message) {
  return (!message || message == '' || message == ' ' || message == 'trello')
}

function addTrelloCard(cardTitle, cardDescription = '') {
  return clientTrello.addCard(cardTitle, cardDescription, toDoListId);
}

function sendTwilioMessage(to, text) {
  clientTwilio.messages.create({
      body: text,
      to: to,
      from: myTwilioNumber
  }, function(err, message) {
    if(err) {
      console.log("ERROR:", err)
    } else {
      console.log("Success sending message :", message.body);
    }
  });
}
