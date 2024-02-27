import test from 'ava';
import fs from 'fs';
import { LocalEmailIntegration, LocalConfiguration } from './local_email_service';
import { Email } from '../model/email';
import { TemplatedEmail } from '../model/templated_email';
import { Template } from '../model/template';

test('sendEmail logs email information to file when outputFile is provided', (t) => {
  // Create a mock LocalConfiguration with the test output file
  const testOutputFile = 'testOne.txt';
  const localConfiguration = new LocalConfiguration(testOutputFile);
  const localIntegration = new LocalEmailIntegration(localConfiguration);

  const email = new Email('sender@example.com', ['recipient1@example.com', 'recipient2@example.com'], 'Test email', '<p>This is a test email</p>', 'This is a test email', ['cc1@example.com', 'cc2@example.com'], ['bcc1@example.com', 'bcc2@example.com'], ['reply-to@example.com']);

  // Call the sendEmail method (which will invoke saveLog)
  localIntegration.sendEmail(email);

  // Assert that the log message was written to the file
  const logData = fs.readFileSync(testOutputFile, 'utf8');

  t.true(logData.includes('SENDING EMAIL:'));
  t.true(logData.includes('To: recipient1@example.com,recipient2@example.com'));
  t.true(logData.includes('CC: cc1@example.com,cc2@example.com'));
  t.true(logData.includes('BCC: bcc1@example.com,bcc2@example.com'));
  t.true(logData.includes('Reply To: reply-to@example.com'));
  t.true(logData.includes('Subject: Test email'));
  t.true(logData.includes('Text Body: This is a test email'));
  t.true(logData.includes('HTML Body: <p>This is a test email</p>'));

  fs.unlinkSync(testOutputFile);
});

test('sendTemplatedEmail logs email information to file when outputFile is provided', (t) => {
    // Create a mock LocalConfiguration with the test output file
    const testOutputFile = 'testTwo.txt';
    const localConfiguration = new LocalConfiguration(testOutputFile);
    const localIntegration = new LocalEmailIntegration(localConfiguration);
  
    const email = new TemplatedEmail('from@example.com', ['to@example.com'], 'TestTemplate', '{ "name": "Bob" }', ['cc@example.com'], ['bcc@example.com'], ['reply-to@example.com']);  
    
    const template = new Template('TestTemplate', 'Test Subject {{name}} {{name}}', '<p>Test HTML Body {{name}}</p>', 'Test {{name}} Text Body');
    localIntegration.createTemplate(template, false);

    // Call the sendEmail method (which will invoke saveLog)
    localIntegration.sendTemplatedEmail(email);
  
    // Assert that the log message was written to the file
    const logData = fs.readFileSync(testOutputFile, 'utf8');
    
    t.true(logData.includes('SENDING TEMPLATED EMAIL:'));
    t.true(logData.includes('To: to@example.com'));
    t.true(logData.includes('CC: cc@example.com'));
    t.true(logData.includes('BCC: bcc@example.com'));
    t.true(logData.includes('Reply To: reply-to@example.com'));
    t.true(logData.includes('Subject: Test Subject Bob Bob'));
    t.true(logData.includes('Text Body: Test Bob Text Body'));
    t.true(logData.includes('HTML Body: <p>Test HTML Body Bob</p>'));
  
    fs.unlinkSync(testOutputFile);
  });