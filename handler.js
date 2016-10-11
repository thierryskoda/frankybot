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

const FACEBOOK_TYPE = "facebook";
const TWILIO_TYPE = "twilio";

const Wit = require('node-wit').Wit;

console.log("wit:", Wit)

const client = new Wit({
  accessToken: MY_TOKEN,
  actions: {
    send(request, response) {
      return new Promise(function(resolve, reject) {
        console.log(JSON.stringify(response));
        return resolve();
      });
    },
    myAction({sessionId, context, text, entities}) {
      console.log(`Session ${sessionId} received ${text}`);
      console.log(`The current context is ${JSON.stringify(context)}`);
      console.log(`Wit extracted ${JSON.stringify(entities)}`);
      return Promise.resolve(context);
    }
  }
});





/*/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\
 /  Lambda function handlers
 /\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\*/
module.exports.hello = (event, context, cb) => cb(null, { message: 'Go Serverless v1.0! Your function executed successfully!', event });

module.exports.receiveTwilioMessage = (event, context, cb) => {
  const messageAction = event.body.Body.split(' ')[0];
  const messageBody = event.body.Body.substr(event.body.Body.indexOf(' ') + 1);

  // Evaluate the action
  // And reply to the person
  doAction(messageAction, messageBody)
  .then(reply.bind(null, event.body.From, TWILIO_TYPE))
  .catch((err) => { console.log("ERROR:", err); })

  // Just tell everyone everything is okay!
  cb(null, {message: "Message was well received!", status: 200});
};

module.exports.validateFacebookToken = (event, context, cb) => {
  if (event.query['hub.mode'] === 'subscribe' && event.query['hub.verify_token'] === process.env.FACEBOOK_VALIDATION_TOKEN) {
    cb(null, parseInt(event.query['hub.challenge']));
  } else {
    cb(null, "Can't validate facebook webhook");
  }
};

module.exports.receiveFacebookMessage = (event, context, cb) => {
  let data = event.body;

  // Make sure this is a page subscription
  if (data.object == 'page') {
    // Iterate over each entry
    // There may be multiple if batched
    data.entry.forEach(function(pageEntry) {
      let pageID = pageEntry.id;
      let timeOfEvent = pageEntry.time;

      // Iterate over each messaging event
      pageEntry.messaging.forEach(function(messagingEvent) {
        if (messagingEvent.optin) {
          receivedAuthentication(messagingEvent);
        } else if (messagingEvent.message) {
          receivedMessage(messagingEvent);
        } else if (messagingEvent.delivery) {
          receivedDeliveryConfirmation(messagingEvent);
        } else if (messagingEvent.postback) {
          receivedPostback(messagingEvent);
        } else {
          console.log("Webhook received unknown messagingEvent");
        }
      });
    });

    // Assume all went well.
    //
    // You must send back a 200, within 20 seconds, to let us know you've
    // successfully received the callback. Otherwise, the request will time out.
    cb(null, {message: "Message was well received!", status: 200});
  }
};







/*/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\
 /  Private functions
 /\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\*/

function reply(to, socialNeworkType, message) {
  switch(socialNeworkType) {
    case TWILIO_TYPE:
      sendTwilioMessage(to, message);
      break;

    case FACEBOOK_TYPE:
      sendTextMessage(to, message);
      break;
  }
}

function doAction(action, body) {
  return new Promise((resolve, reject) => {
    switch(action.toLowerCase()) {
      case 'trello':
        if(messageBodyIsInvalid(body)){
          return resolve(`No title to your trello card ? ${emoji.get('thinking_face')}`);
        }
        addTrelloCard(body)
        .then(() => { resolve(`Your card has been added ${emoji.get('relieved')}${emoji.get('notebook')}`); })
        .catch((err) => { reject(err); })
        break;
      case 'weather':
        getCurrentWeatherFor(body.split(' ')[0])
        .then(formatWeatherResponse)
        .then((formatedWeather) => { resolve(formatedWeather); })
        .catch((err) => { reject(err) })
        break;
      case 'actions':
        resolve(`All actions possible are: 'trello [CARD_TITLE]' ... 'weather [CITY]' ${emoji.get('punch')}`);
        break;
      default:
        resolve(`Wrong action. I can't understand ${emoji.get('disappointed')}${emoji.get('thumbsdown')}. All actions possible are: 'trello [CARD_TITLE]', 'weather [CITY]' ${emoji.get('punch')}`);
        break;
    };
  })
}

function callSendAPI(messageData) {
  const requestOption = {
    uri: 'https://graph.facebook.com/v2.6/me/messages',
    qs: { access_token: process.env.FACEBOOK_PAGE_ACCESS_TOKEN },
    method: 'POST',
    json: messageData
  };

  requestPromise(requestOption)
  .then((result) => {
    let recipientId = result.recipient_id;
    let messageId = result.message_id;
  })
  .catch((err) => {
    if(err) {
      console.error("ERROR, callSendAPI with messageData, error is : ", (err.error) ? err.error.message : err);
    }
  });
}

function sendGenericMessage(recipientId) {
  let messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "generic",
          elements: [{
            title: "rift",
            subtitle: "Next-generation virtual reality",
            item_url: "https://www.oculus.com/en-us/rift/",
            image_url: "http://messengerdemo.parseapp.com/img/rift.png",
            buttons: [{
              type: "web_url",
              url: "https://www.oculus.com/en-us/rift/",
              title: "Open Web URL"
            }, {
              type: "postback",
              title: "Call Postback",
              payload: "Payload for first bubble",
            }],
          }, {
            title: "touch",
            subtitle: "Your Hands, Now in VR",
            item_url: "https://www.oculus.com/en-us/touch/",
            image_url: "http://messengerdemo.parseapp.com/img/touch.png",
            buttons: [{
              type: "web_url",
              url: "https://www.oculus.com/en-us/touch/",
              title: "Open Web URL"
            }, {
              type: "postback",
              title: "Call Postback",
              payload: "Payload for second bubble",
            }]
          }]
        }
      }
    }
  };

  callSendAPI(messageData);
}

function receivedDeliveryConfirmation(messagingEvent) {
}

function sendTextMessage(recipientId, messageText) {
  let messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: messageText
    }
  };

  callSendAPI(messageData);
}

function receivedPostback(event) {
  let senderID = event.sender.id;
  let recipientID = event.recipient.id;
  let timeOfPostback = event.timestamp;

  // The 'payload' param is a developer-defined field which is set in a postback
  // button for Structured Messages.
  let payload = event.postback.payload;

  console.log("Received postback for user %d and page %d with payload '%s' " + "at %d", senderID, recipientID, payload, timeOfPostback);

  // When a postback is called, we'll send a message back to the sender to
  // let them know it was successful
  sendTextMessage(senderID, "Postback called");
}


function receivedMessage(event) {
  let senderID = event.sender.id;
  let recipientID = event.recipient.id;
  let timeOfMessage = event.timestamp;
  let message = event.message;

  console.log("The facebook message received:", message.text);

  let messageId = message.mid;

  // You may get a text or attachment but not both
  let messageText = message.text;
  let messageAttachments = message.attachments;

  if (messageText) {
    const messageAction = messageText.split(' ')[0];
    const messageBody = messageText.substr(messageText.indexOf(' ') + 1);

    doAction(messageAction, messageBody)
      .then(reply.bind(null, senderID, FACEBOOK_TYPE))
      .catch((err) => { console.log("ERROR:", err); })
  } else if (messageAttachments) {
    sendTextMessage(senderID, "Message with attachment received");
  }
}


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
      console.log("TWILIO ERROR:", err)
    } else {
      console.log("TWILIO, Success sending message :", message.body);
    }
  });
}
