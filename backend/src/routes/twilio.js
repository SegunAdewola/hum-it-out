const express = require('express');
const twilio = require('twilio');
const { VoiceResponse } = require('twilio').twiml;
const config = require('../config/environment');
const logger = require('../utils/logger');
const TwilioService = require('../services/TwilioService');
const AuthService = require('../services/AuthService');
const ProcessingService = require('../services/ProcessingService');

const router = express.Router();
const twilioService = new TwilioService();

// Twilio webhook signature validation middleware
const validateTwilioSignature = (req, res, next) => {
  if (process.env.NODE_ENV === 'development') {
    // Skip validation in development
    return next();
  }

  const twilioSignature = req.headers['x-twilio-signature'];
  const url = `https://${req.headers.host}${req.originalUrl}`;
  const params = req.body;

  const isValid = twilio.validateRequest(
    config.twilio.authToken,
    twilioSignature,
    url,
    params
  );

  if (!isValid) {
    logger.warn('Invalid Twilio signature:', {
      signature: twilioSignature,
      url,
      params
    });
    return res.status(403).send('Invalid Twilio signature');
  }

  next();
};

// Incoming call handler
router.post('/voice', validateTwilioSignature, async (req, res) => {
  const twiml = new VoiceResponse();
  
  try {
    const { From, To, CallSid } = req.body;
    
    logger.info('Incoming call:', {
      from: From,
      to: To,
      callSid: CallSid
    });

    // Log the call
    await twilioService.logCall(CallSid, From, 'incoming_call', true);

    // Greet user and request PIN
    const gather = twiml.gather({
      input: 'dtmf',
      timeout: 10,
      numDigits: 6,
      finishOnKey: '#',
      action: '/twilio/authenticate',
      method: 'POST'
    });

    gather.say({
      voice: 'alice',
      language: 'en-US'
    }, 'Welcome to Hum It Out! Please enter your 6-digit PIN, followed by the pound key.');

    // Fallback if no input received
    twiml.say({
      voice: 'alice'
    }, 'I didn\'t receive your PIN. Please call back and try again. Goodbye!');

  } catch (error) {
    logger.error('Error handling incoming call:', error);
    twiml.say('Sorry, there was a technical issue. Please try again later.');
  }

  res.type('text/xml');
  res.send(twiml.toString());
});

// PIN authentication handler
router.post('/authenticate', validateTwilioSignature, async (req, res) => {
  const twiml = new VoiceResponse();
  
  try {
    const { Digits, From, CallSid } = req.body;
    
    logger.info('PIN authentication attempt:', {
      digits: Digits ? 'REDACTED' : 'null',
      from: From,
      callSid: CallSid
    });

    // Validate PIN format
    if (!Digits || !/^\d{6}$/.test(Digits)) {
      await twilioService.logCall(CallSid, From, 'pin_failure', false, 'Invalid PIN format');
      twiml.say('Invalid PIN format. Please call back and enter a 6-digit number.');
      res.type('text/xml');
      return res.send(twiml.toString());
    }

    // Authenticate user
    const user = await AuthService.validatePIN(Digits);
    
    if (!user) {
      await twilioService.logCall(CallSid, From, 'pin_failure', false, 'Invalid PIN');
      twiml.say('Invalid PIN. Please check your PIN and try again.');
      res.type('text/xml');
      return res.send(twiml.toString());
    }

    // Log successful authentication
    await twilioService.logCall(CallSid, From, 'pin_success', true, null, user.id);

    // Proceed to recording
    twiml.say({
      voice: 'alice'
    }, `Welcome back! Start humming or singing your melody after the beep. You have 30 seconds. Go!`);

    twiml.record({
      maxLength: 30,
      timeout: 5,
      playBeep: true,
      trim: 'trim-silence',
      recordingStatusCallback: `/twilio/recording-status?userId=${user.id}&callSid=${CallSid}`,
      action: `/twilio/recording-complete?userId=${user.id}&callSid=${CallSid}`,
      method: 'POST'
    });

    twiml.say('Thank you for recording. We\'re processing your music now!');

  } catch (error) {
    logger.error('Authentication error:', error);
    await twilioService.logCall(req.body.CallSid, req.body.From, 'pin_failure', false, error.message);
    twiml.say('Sorry, there was a technical issue during authentication. Please try again.');
  }

  res.type('text/xml');
  res.send(twiml.toString());
});

// Recording completion handler
router.post('/recording-complete', validateTwilioSignature, async (req, res) => {
  const twiml = new VoiceResponse();
  
  try {
    const { userId, callSid } = req.query;
    const { RecordingUrl, RecordingSid, RecordingDuration } = req.body;

    logger.info('Recording completed:', {
      userId,
      callSid,
      recordingSid: RecordingSid,
      duration: RecordingDuration,
      url: RecordingUrl ? 'provided' : 'missing'
    });

    if (!RecordingUrl) {
      throw new Error('No recording URL provided');
    }

    // Log recording completion
    await twilioService.logCall(callSid, req.body.From, 'recording_complete', true, null, userId);

    // Queue processing job
    await ProcessingService.queueProcessingJob({
      userId,
      callSid,
      recordingUrl: RecordingUrl + '.wav', // Get WAV format
      recordingSid: RecordingSid,
      duration: parseInt(RecordingDuration),
      phoneNumber: req.body.From
    });

    // Immediate response to user
    twiml.say({
      voice: 'alice'
    }, 'Perfect! Your recording is being processed. You\'ll receive a text message with download links in about one minute. Thank you for using Hum It Out!');

  } catch (error) {
    logger.error('Recording completion error:', error);
    twiml.say('There was an issue processing your recording. Please try again.');
  }

  res.type('text/xml');
  res.send(twiml.toString());
});

// Recording status callback (for monitoring)
router.post('/recording-status', validateTwilioSignature, async (req, res) => {
  try {
    const { userId, callSid } = req.query;
    const { RecordingStatus, RecordingSid } = req.body;

    logger.info('Recording status update:', {
      userId,
      callSid,
      recordingSid: RecordingSid,
      status: RecordingStatus
    });

    // Update processing status if needed
    if (RecordingStatus === 'failed') {
      await ProcessingService.handleRecordingFailure(userId, callSid, 'Recording failed');
    }

  } catch (error) {
    logger.error('Recording status error:', error);
  }

  res.sendStatus(200);
});

// Error handler for Twilio webhooks
router.use((error, req, res, next) => {
  logger.error('Twilio webhook error:', error);
  
  const twiml = new VoiceResponse();
  twiml.say('Sorry, there was a technical issue. Please try again later.');
  
  res.type('text/xml');
  res.send(twiml.toString());
});

module.exports = router;
