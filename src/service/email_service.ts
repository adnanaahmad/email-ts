import { Email } from '../model/email';
import { Template } from '../model/template';
import { TemplatedEmail } from '../model/templated_email';

export abstract class EmailProviderConfiguration { }

export class DefaultConfiguration extends EmailProviderConfiguration { }

/**
 * Custom configuration for AWS. Only use this if absolutely necessary.
 */
export class AwsConfiguration extends EmailProviderConfiguration {
    readonly configurationSetName?: string;
    readonly tags?: Map<string, string>;

    constructor(configurationSetName?: string, tags?: Map<string, string>) {
        super();
        this.configurationSetName = configurationSetName;
        this.tags = tags;
    }
}

export enum EmailProvider {
    AWS,
    LOCAL,
    FAKE
}

export abstract class EmailIntegration {
    /**
     * Sends the same email to all the provided addresses
     */
    abstract sendEmail(email: Email): Promise<void>;

    /**
     * Sends the same templated email to all provided addresses
     */
    abstract sendTemplatedEmail(email: TemplatedEmail): Promise<void>;

    /**
     * Sends out a list of emails
     */
    abstract sendBulkEmails(emails: Email[]): Promise<Map<Email, boolean>>;

    /**
     * Sends out a list of templated emails
     */
    abstract sendBulkTemplatedEmails(emails: TemplatedEmail[]): Promise<Map<TemplatedEmail, boolean>>;

    /**
     * Creates the template if it doesn't exist and depending on the parameter may update if it already exists.
     * Will not throw an error if the template already exists.
     */
    abstract createTemplate(template: Template, updateIfExists: boolean): Promise<void>;

    abstract deleteTemplate(templateName: string): Promise<void>;

    abstract updateTemplate(template: Template): Promise<void>;
}

export interface EmailService {
    /**
     * Set the list of supported Email Providers. The list is used with the providers
     * being given priority in order
     * 
     * @param emailProviders The list of email providers that should be used
     */
    setSupportedEmailProviders(emailProviders: Map<EmailProvider, EmailProviderConfiguration>);

    // Sends the provided email and returns a status indicating the result
    sendEmail(email: Email): Promise<void>;

    // Sends the provided templated email and returns a status indicating the result
    sendTemplatedEmail(email: TemplatedEmail): Promise<void>;

    // Sends the bulk emails and returns a map from the emails to the status
    sendBulkEmails(emails: Email[]): Promise<Map<Email, boolean>>;

    // Sends out the provided templated emails and returns a map from the emails to the status
    sendBulkTemplatedEmails(emails: TemplatedEmail[]): Promise<Map<TemplatedEmail, boolean>>;

    createTemplate(emailProvider: EmailProvider, template: Template, updateIfExists: boolean): Promise<void>;

    deleteTemplate(emailProvider: EmailProvider, templateName: string): Promise<void>;

    updateTemplate(emailProvider: EmailProvider, template: Template): Promise<void>;
}