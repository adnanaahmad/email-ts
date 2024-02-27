import test from 'ava';
import { mockClient } from "aws-sdk-client-mock";
import { SESClient, SendEmailCommand, SendTemplatedEmailCommand, CreateTemplateCommand, UpdateTemplateCommand, DeleteTemplateCommand } from '@aws-sdk/client-ses';
import { AwsEmailIntegration } from './aws_email_service';
import { AwsConfiguration } from '../service/email_service';
import { Email } from '../model/email';
import { TemplatedEmail } from '../model/templated_email';
import { Template } from '../model/template';

test('getConfigurationSetName() returns correct value when awsConfiguration exists', async (t) => {
    // Mocked emailProviderConfiguration for test purposes.
const mockedEmailProviderConfiguration = new AwsConfiguration('testConfigurationSet', new Map([['tag-key', 'tag-value']]));
    // Arrange
    const awsEmailIntegration = new AwsEmailIntegration(mockedEmailProviderConfiguration);

    // Act
    const configurationSetName = awsEmailIntegration.getConfigurationSetName();

    // Assert
    t.true(configurationSetName !== undefined);
    t.is(configurationSetName, 'testConfigurationSet');
});

test('getConfigurationSetName() returns undefined if awsConfiguration does not exist', async (t) => {
    // Arrange
    const awsEmailIntegration = new AwsEmailIntegration(new AwsConfiguration());

    // Act
    const configurationSetName = awsEmailIntegration.getConfigurationSetName();

    // Assert
    t.is(configurationSetName, undefined);
});

test('getMessageTags() returns message tags when awsConfiguration and tags exist', async (t) => {
    // Arrange
    const mockedEmailProviderConfiguration = new AwsConfiguration('testConfiguration', new Map([['tag1', 'value1'], ['tag2', 'value2']]));
    const awsEmailIntegration = new AwsEmailIntegration(mockedEmailProviderConfiguration);

    // Act
    const messageTags = awsEmailIntegration.getMessageTags();

    // Assert
    t.true(Array.isArray(messageTags));
    t.is(messageTags!.length, 2);

    for (const messageTag of messageTags!) {
        t.true(typeof messageTag.Name === 'string');
        t.true(typeof messageTag.Value === 'string');
    }
});

test('getMessageTags() returns undefined if awsConfiguration does not exist', async (t) => {
    // Arrange
    const awsEmailIntegration = new AwsEmailIntegration({});

    // Act
    const messageTags = awsEmailIntegration.getMessageTags();

    // Assert
    t.is(messageTags, undefined);
});

test('getMessageTags() returns undefined if tags do not exist in awsConfiguration', async (t) => {
    // Arrange
    const mockedEmailProviderConfiguration = new AwsConfiguration();
    const awsEmailIntegration = new AwsEmailIntegration(mockedEmailProviderConfiguration);

    // Act
    const messageTags = awsEmailIntegration.getMessageTags();

    // Assert
    t.is(messageTags, undefined);
});

test('sendEmail sends email successfully', async t => {
    const mockSESClient = mockClient(SESClient);
    let commandCalled = false;

    const awsConfiguration = new AwsConfiguration('configuration-set-name', new Map<string, string>([
        ['tag1', 'value1'],
        ['tag2', 'value2'],
    ]));
    const awsEmailIntegration = new AwsEmailIntegration(awsConfiguration);
    const email = new Email('sender@example.com', ['recipient1@example.com', 'recipient2@example.com'], 'Test email', '<p>This is a test email</p>', 'This is a test email', ['cc1@example.com', 'cc2@example.com'], ['bcc1@example.com', 'bcc2@example.com'], ['reply-to@example.com']);

    // Mock the SendEmailCommand method of the SES client
    mockSESClient.on(SendEmailCommand).callsFake((input) => {
        t.deepEqual(input.Source, email.senderEmailAddress);
        t.deepEqual(input.Destination, { ToAddresses: email.toEmailAddresses, CcAddresses: email.ccEmailAddresses, BccAddresses: email.bccEmailAddresses });
        t.deepEqual(input.Message.Subject.Data, email.subject);
        t.deepEqual(input.Message.Body.Text.Data, email.textBody);
        t.deepEqual(input.Message.Body.Html.Data, email.htmlBody);
        t.deepEqual(input.ReplyToAddresses, email.replyToEmailAddresses);
        commandCalled = true;
    });

    // Call your code that uses the SES client
    await awsEmailIntegration.sendEmail(email);
  
    // Assert that the result is as expected
    t.true(commandCalled);

    // Clean up the mock
    mockSESClient.reset();
});

test('sendEmail fails to send email', async t => {
    const mockSESClient = mockClient(SESClient);

    const awsConfiguration = new AwsConfiguration('configuration-set-name', new Map<string, string>([
        ['tag1', 'value1'],
        ['tag2', 'value2'],
    ]));
    const awsEmailIntegration = new AwsEmailIntegration(awsConfiguration);
    const email = new Email('sender@example.com', ['recipient1@example.com', 'recipient2@example.com'], 'Test email', '<p>This is a test email</p>', 'This is a test email', ['cc1@example.com', 'cc2@example.com'], ['bcc1@example.com', 'bcc2@example.com'], ['reply-to@example.com']);

    // Mock the SendEmailCommand method of the SES client
    mockSESClient.on(SendEmailCommand).callsFake(() => {
        throw new Error('Unable to send email')
    });

    // Call your code that uses the SES client
    await t.throwsAsync(async () => {
        await awsEmailIntegration.sendEmail(email);
    },{
        message: 'Unable to send email'
    });
    // Clean up the mock
    mockSESClient.reset();
});

test('sendEmail throws an error for >50 recipients', async t => {
    const mockSESClient = mockClient(SESClient);

    const awsConfiguration = new AwsConfiguration('configuration-set-name', new Map<string, string>([
        ['tag1', 'value1'],
        ['tag2', 'value2'],
    ]));
    const awsEmailIntegration = new AwsEmailIntegration(awsConfiguration);
    const email = new Email('sender@example.com', Array.from({ length: 60 }, (_, i) => `testRecipient${i}@example.com`), 'Test email', '<p>This is a test email</p>', 'This is a test email', ['cc1@example.com', 'cc2@example.com'], ['bcc1@example.com', 'bcc2@example.com'], ['reply-to@example.com']);

    // Mock the SendEmailCommand method of the SES client
    mockSESClient.on(SendEmailCommand);
    
    // Test if sendEmail throws an error for >50 recipients
    await t.throwsAsync(async () => {
        await awsEmailIntegration.sendEmail(email);
    },{
        message: 'Too many recipients. Use sendBulkEmails instead'
    });

    // Clean up the mock
    mockSESClient.reset();
	//t.falsy(0);
});

test('sendTemplatedEmail sends email correctly', async (t) => {
    const mockSESClient = mockClient(SESClient);
    let commandCalled = false;
    // Create an instance of AwsEmailIntegration with a mock AwsConfiguration
    const awsConfig = new AwsConfiguration('my-config-set', new Map([['key', 'value']]));
    const emailIntegration = new AwsEmailIntegration(awsConfig);

    // Define a mock templated email to send
    const email = new TemplatedEmail('from@example.com', ['to@example.com'], 'my-template', '{ "name": "Bob" }', ['cc@example.com'], ['bcc@example.com'], ['reply-to@example.com']);
    // Mock the SES sendTemplatedEmail function
    mockSESClient.on(SendTemplatedEmailCommand).callsFake(input => {
        t.deepEqual(input.Source, email.senderEmailAddress);
        t.deepEqual(input.Destination, { ToAddresses: email.toEmailAddresses, CcAddresses: email.ccEmailAddresses, BccAddresses: email.bccEmailAddresses });
        t.deepEqual(input.ReplyToAddresses, email.replyToEmailAddresses);
        t.deepEqual(input.Template, email.templateName);
        t.deepEqual(input.TemplateData, email.templateData);
        commandCalled = true;
    });

    // Call sendTemplatedEmail on the email integration object
    await emailIntegration.sendTemplatedEmail(email);

    // Assert that the result is as expected
    t.true(commandCalled);

    // Clean up the mock
    mockSESClient.reset();
});

test('sendTemplatedEmail fails to send email', async (t) => {
    const mockSESClient = mockClient(SESClient);
    
    // Create an instance of AwsEmailIntegration with a mock AwsConfiguration
    const awsConfig = new AwsConfiguration('my-config-set', new Map([['key', 'value']]));
    const emailIntegration = new AwsEmailIntegration(awsConfig);

    // Define a mock templated email to send
    const email = new TemplatedEmail('from@example.com', ['to@example.com'], 'my-template', '{ "name": "Bob" }', ['cc@example.com'], ['bcc@example.com'], ['reply-to@example.com']);
    
    // Mock the SES sendTemplatedEmail function
    mockSESClient.on(SendTemplatedEmailCommand).callsFake(() => {
        throw new Error('Unable to send email')
    });

    // Call your code that uses the SES client
    await t.throwsAsync(async () => {
        await emailIntegration.sendTemplatedEmail(email);
    },{
        message: 'Unable to send email'
    });

    // Clean up the mock
    mockSESClient.reset();
});

test('sendBulkEmails should return a Map of sent emails', async t => {
    const mockSESClient = mockClient(SESClient);
    let commandCalled = false;
  
    const configuration = new AwsConfiguration('my-configuration-set', new Map([['tag1', 'value1'], ['tag2', 'value2']]));
    const emailIntegration = new AwsEmailIntegration(configuration);
  
    const email1 = new Email("from@example.com", ["to@example.com"], "Testing Email One", "Hello", "Hello");
    const email2 = new Email("from@example.com", ["another@example.com"], "Testing Email Two", "Hello", "Hello");
    const emails = [email1, email2];

    mockSESClient.on(SendEmailCommand).callsFake(() => {
        commandCalled = true;
    });
  
    const result = await emailIntegration.sendBulkEmails(emails);
    
    t.true(commandCalled);
    t.true(result instanceof Map);
    t.is(result.size, 2);
    t.true(result.get(email1));
    t.true(result.get(email2));
  
    mockSESClient.reset();
});

test('sendBulkTemplatedEmails should return a Map of sent emails', async t => {
    const mockSESClient = mockClient(SESClient);
    let commandCalled = false;
  
    const configuration = new AwsConfiguration('my-configuration-set', new Map([['tag1', 'value1'], ['tag2', 'value2']]));
    const emailIntegration = new AwsEmailIntegration(configuration);

    const email1 = new TemplatedEmail('from@example.com', ['to@example.com'], 'my-template', '{ "name": "Bob" }', ['cc@example.com'], ['bcc@example.com'], ['reply-to@example.com']);
    const email2 = new TemplatedEmail('from@example.com', ['toAnother@example.com'], 'my-template', '{ "name": "Lee" }', ['cc@example.com'], ['bcc@example.com'], ['reply-to@example.com']);
    const emails = [email1, email2];
  
    mockSESClient.on(SendTemplatedEmailCommand).callsFake(() => {
        commandCalled = true;
    });

    const result = await emailIntegration.sendBulkTemplatedEmails(emails);
  
    t.true(commandCalled);
    t.true(result instanceof Map);
    t.is(result.size, 2);
    t.true(result.get(email1));
    t.true(result.get(email2));
  
    mockSESClient.reset();
});

test('createTemplate creates a new template', async t => {
    const mockSESClient = mockClient(SESClient);
    mockSESClient.on(CreateTemplateCommand).resolves({});

    const configuration = new AwsConfiguration('my-configuration-set', new Map([['tag1', 'value1'], ['tag2', 'value2']]));
    const emailIntegration = new AwsEmailIntegration(configuration);
    const template = new Template('TestTemplate', 'Test Subject', '<p>Test HTML Body</p>', 'Test Text Body');
      
    await emailIntegration.createTemplate(template, false);
    // Assert that the result is as expected
    t.assert(mockSESClient.call);

    // Clean up the mock
    mockSESClient.reset();
});

test('updateTemplate should update template with correct parameters', async t => {
    const mockSESClient = mockClient(SESClient);
    mockSESClient.on(UpdateTemplateCommand).resolves({});

    const configuration = new AwsConfiguration('my-configuration-set', new Map([['tag1', 'value1'], ['tag2', 'value2']]));
    const emailIntegration = new AwsEmailIntegration(configuration);
    const template = new Template('TestTemplate', 'Test Subject', '<p>Test HTML Body</p>', 'Test Text Body');
      
    await emailIntegration.updateTemplate(template);
    // Assert that the result is as expected
    t.assert(mockSESClient.call);

    // Clean up the mock
    mockSESClient.reset();
});

test('deleteTemplate should delete template', async (t) => {
    // Mock the SES client's deleteTemplate method
    const mockSESClient = mockClient(SESClient);
    mockSESClient.on(DeleteTemplateCommand).resolves({});
  
    const configuration = new AwsConfiguration('my-configuration-set', new Map([['tag1', 'value1'], ['tag2', 'value2']]));
    const emailIntegration = new AwsEmailIntegration(configuration);
  
    const templateName = 'my-template';
    await emailIntegration.deleteTemplate(templateName);
  
    // Assert that the result is as expected
    t.assert(mockSESClient.call);
  
    // Clean up the mock
    mockSESClient.reset();
});
