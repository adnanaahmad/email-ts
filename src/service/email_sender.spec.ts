import test from 'ava';
import { EmailSender } from './email_sender';
import { EmailIntegration, EmailProvider, EmailProviderConfiguration } from './email_service';
import { Email } from '../model/email';
import { TemplatedEmail } from '../model/templated_email';
import { Template } from '../model/template';

export class FakeEmailIntegration implements EmailIntegration {
    readonly templates: Map<string, Template> = new Map();
    static emails: Map<Email, boolean> = new Map();
    static templatedEmails: Map<TemplatedEmail, boolean> = new Map();
    static throwError: Boolean;

    constructor() { }

    async sendEmail(email: Email): Promise<void> {
        if (FakeEmailIntegration.throwError) {
            throw new Error("Something went wrong");
        }
        FakeEmailIntegration.emails.set(email, true);
        return Promise.resolve();
    }

    getSentEmails(): Map<Email, boolean> {
        return FakeEmailIntegration.emails;
    }

    async sendTemplatedEmail(email: TemplatedEmail): Promise<void> {
        if (FakeEmailIntegration.throwError) {
            throw new Error("Something went wrong");
        }
        FakeEmailIntegration.templatedEmails.set(email, true);
        return Promise.resolve();
    }

    getSentTemplatedEmails(): Map<TemplatedEmail, boolean> {
        return FakeEmailIntegration.templatedEmails;
    }

    async sendBulkEmails(emails: Email[]): Promise<Map<Email, boolean>> {
        const results = new Map<Email, boolean>();
        await Promise.all(emails.map(async (email) => {
            try {
                await this.sendEmail(email);
                results.set(email, true);
            } catch (error) {
                results.set(email, false);
            }
        }));
        return results;
    }

    async sendBulkTemplatedEmails(emails: TemplatedEmail[]): Promise<Map<TemplatedEmail, boolean>> {
        const results = new Map<TemplatedEmail, boolean>();
        await Promise.all(emails.map(async (email) => {
            try {
                await this.sendTemplatedEmail(email);
                results.set(email, true);
            } catch (error) {
                results.set(email, false);
            }
        }));
        return results;
    }

    async createTemplate(template: Template, updateIfExists: boolean): Promise<void> {
        if (!this.templates.has(template.templateName) || updateIfExists) {
            this.templates.set(template.templateName, template);
        }
    }

    async updateTemplate(template: Template): Promise<void> {
        if (!this.templates.has(template.templateName)) {
            throw new Error("No template with the name " + template.templateName);
        }
        this.templates.set(template.templateName, template);
    }

    async deleteTemplate(templateName: string): Promise<void> {
        if (!this.templates.has(templateName)) {
            throw new Error("No template with the name " + templateName);
        }
        this.templates.delete(templateName);
    }
    setThrowError(input: boolean): void {
        FakeEmailIntegration.throwError = input;
    }
};

function setup() {
    const emailSender = new EmailSender();
    const emailProviders: Map<EmailProvider, EmailProviderConfiguration> = new Map();
    const fakeEmailIntegration = new FakeEmailIntegration();
    emailProviders.set(EmailProvider.FAKE, fakeEmailIntegration);
    emailSender.setSupportedEmailProviders(emailProviders);
    fakeEmailIntegration.setThrowError(false);
    return { emailSender, fakeEmailIntegration };
}

test('setSupportedEmailProviders should add supported email providers to the emailProviders map', t => {
    const { emailSender } = setup();

    // Assert
    t.true(emailSender['emailProviders'].has(EmailProvider.FAKE));
});

test('sendEmail should send email using a supported email provider', async t => {
    const { emailSender, fakeEmailIntegration } = setup();

    const email = new Email('sender@example.com', ['recipient1@example.com', 'recipient2@example.com'], 'Test email', '<p>This is a test email</p>', 'This is a test email', ['cc1@example.com', 'cc2@example.com'], ['bcc1@example.com', 'bcc2@example.com'], ['reply-to@example.com']);

    // Call the sendEmail method and assert that it resolves successfully
    await t.notThrowsAsync(async () => {
        await emailSender.sendEmail(email);
    });
    t.true(fakeEmailIntegration.getSentEmails().has(email));
});

test('sendEmail should throw error', async t => {
    const { emailSender, fakeEmailIntegration } = setup();
    fakeEmailIntegration.setThrowError(true);

    const email = new Email('sender@example.com', ['recipient1@example.com', 'recipient2@example.com'], 'Test email', '<p>This is a test email</p>', 'This is a test email', ['cc1@example.com', 'cc2@example.com'], ['bcc1@example.com', 'bcc2@example.com'], ['reply-to@example.com']);

    // Act
    const error = await t.throwsAsync(async () => {
        await emailSender.sendEmail(email);
    });
    // Assert
    t.is(error.message.split("\n")[0], 'Unable to send email on any integration');
});

test('sendTemplatedEmail should send templated email using a supported email provider', async t => {
    const { emailSender, fakeEmailIntegration } = setup();

    const templatedEmail = new TemplatedEmail('from@example.com', ['to@example.com'], 'my-template', '{ "name": "Bob" }', ['cc@example.com'], ['bcc@example.com'], ['reply-to@example.com']);

    // Call the sendTemplatedEmail method and assert that it resolves successfully
    await t.notThrowsAsync(async () => {
        await emailSender.sendTemplatedEmail(templatedEmail);
    });
    t.true(fakeEmailIntegration.getSentTemplatedEmails().has(templatedEmail));
});

test('sendTemplatedEmail should throw error', async t => {
    const { emailSender, fakeEmailIntegration } = setup();
    fakeEmailIntegration.setThrowError(true);

    const templatedEmail = new TemplatedEmail('from@example.com', ['to@example.com'], 'my-template', '{ "name": "Bob" }', ['cc@example.com'], ['bcc@example.com'], ['reply-to@example.com']);

    // Act
    const error = await t.throwsAsync(async () => {
        await emailSender.sendTemplatedEmail(templatedEmail);
    });
    // Assert
    t.is(error.message.split("\n")[0], 'Unable to send email on any integration');
});

test('sendBulkEmails should return a Map of sent emails', async t => {
    const { emailSender } = setup();

    const email1 = new Email("from@example.com", ["to@example.com"], "Testing Email One", "Hello", "Hello");
    const email2 = new Email("from@example.com", ["another@example.com"], "Testing Email Two", "Hello", "Hello");
    const emails = [email1, email2];

    const result = await emailSender.sendBulkEmails(emails);

    t.true(result instanceof Map);
    t.is(result.size, 2);
    t.true(result.get(email1));
    t.true(result.get(email2));
});

test('sendBulkTemplatedEmails should return a Map of sent emails', async t => {
    const { emailSender } = setup();

    const email1 = new TemplatedEmail('from@example.com', ['to@example.com'], 'my-template', '{ "name": "Bob" }', ['cc@example.com'], ['bcc@example.com'], ['reply-to@example.com']);
    const email2 = new TemplatedEmail('from@example.com', ['toAnother@example.com'], 'my-template', '{ "name": "Lee" }', ['cc@example.com'], ['bcc@example.com'], ['reply-to@example.com']);
    const emails = [email1, email2];

    const result = await emailSender.sendBulkTemplatedEmails(emails);

    t.true(result instanceof Map);
    t.is(result.size, 2);
    t.true(result.get(email1));
    t.true(result.get(email2));
});

test('createTemplate should create a template using a supported email provider', async t => {
    const { emailSender } = setup();

    const template = new Template('TestTemplate', 'Test Subject', '<p>Test HTML Body</p>', 'Test Text Body');

    // Call the createTemplate method and assert that it resolves successfully
    await t.notThrowsAsync(async () => {
        await emailSender.createTemplate(EmailProvider.FAKE, template, false);
    });
});

test('createTemplate should throw an error if email provider is not supported', async t => {
    const { emailSender } = setup();

    const template = new Template('TestTemplate', 'Test Subject', '<p>Test HTML Body</p>', 'Test Text Body');

    // Act
    const error = await t.throwsAsync(async () => {
        await emailSender.createTemplate(EmailProvider.LOCAL, template, true);
    });

    // Assert
    t.is(error.message, 'Creating template for Email provider which does not exist');
});

test('updateTemplate should call SES updateTemplate method with correct arguments', async (t) => {
    const { emailSender } = setup();

    const template = new Template('TestTemplate', 'Test Subject', '<p>Test HTML Body</p>', 'Test Text Body');
    await emailSender.createTemplate(EmailProvider.FAKE, template, false);

    // Call updateTemplate method and assert that it resolves successfully
    await t.notThrowsAsync(async () => {
        await emailSender.updateTemplate(EmailProvider.FAKE, template);
    });
});

test('updateTemplate should throw an error if template does not exist', async (t) => {
    const { emailSender } = setup();

    const template = new Template('RandomTemplate', 'Test Subject', '<p>Test HTML Body</p>', 'Test Text Body');

    const error = await t.throwsAsync(async () => {
        await emailSender.updateTemplate(EmailProvider.FAKE, template);
    });

    // Assert
    t.is(error.message, 'No template with the name RandomTemplate');
});

test('updateTemplate should throw an error if email provider is not supported', async t => {
    const { emailSender } = setup();

    const template = new Template('TestTemplate', 'Test Subject', '<p>Test HTML Body</p>', 'Test Text Body');

    // Act
    const error = await t.throwsAsync(async () => {
        await emailSender.updateTemplate(EmailProvider.LOCAL, template);
    });

    // Assert
    t.is(error.message, 'Creating template for Email provider which does not exist');
});

test('deleteTemplate should call SES deleteTemplate method with correct arguments', async (t) => {
    const { emailSender } = setup();

    const templateName = 'TestTemplate';
    const template = new Template('TestTemplate', 'Test Subject', '<p>Test HTML Body</p>', 'Test Text Body');
    await emailSender.createTemplate(EmailProvider.FAKE, template, false);

    // Call deleteTemplate method and assert that it resolves successfully
    await t.notThrowsAsync(async () => {
        await emailSender.deleteTemplate(EmailProvider.FAKE, templateName);
    });
});

test('deleteTemplate should throw an error if template does not exist', async (t) => {
    const { emailSender } = setup();

    const templateName = 'RandomTemplate';

    // Act
    const error = await t.throwsAsync(async () => {
        await emailSender.deleteTemplate(EmailProvider.FAKE, templateName);
    });

    // Assert
    t.is(error.message, 'No template with the name RandomTemplate');
});

test('deleteTemplate should throw an error if email provider is not supported', async t => {
    const { emailSender } = setup();

    const templateName = 'my-template';

    // Act
    const error = await t.throwsAsync(async () => {
        await emailSender.deleteTemplate(EmailProvider.LOCAL, templateName);
    });

    // Assert
    t.is(error.message, 'Deleting template for Email provider which does not exist');
});