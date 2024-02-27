/* eslint-disable no-case-declarations */
import { AwsEmailIntegration } from '../aws/aws_email_service';
import { LocalEmailIntegration } from '../local/local_email_service';
import { Email } from '../model/email';
import { Template } from '../model/template';
import { TemplatedEmail } from '../model/templated_email';
import { FakeEmailIntegration } from './email_sender.spec';

import { EmailIntegration, EmailProvider, EmailProviderConfiguration, EmailService } from './email_service';

export class EmailSender implements EmailService {

    private emailProviders: Map<EmailProvider, EmailIntegration> = new Map();

    setSupportedEmailProviders(emailProviders: Map<EmailProvider, EmailProviderConfiguration>) {
        for (const emailProvider of emailProviders.keys()) {
            switch (emailProvider) {
                case EmailProvider.AWS:
                    const awsEmailIntegration = new AwsEmailIntegration(emailProviders.get(emailProvider));
                    this.emailProviders.set(emailProvider, awsEmailIntegration);
                    break;
                case EmailProvider.LOCAL:
                    const localEmailIntegration = new LocalEmailIntegration(emailProviders.get(emailProvider));
                    this.emailProviders.set(emailProvider, localEmailIntegration);
                    break;
                case EmailProvider.FAKE:
                    const fakeEmailIntegration = new FakeEmailIntegration();
                    this.emailProviders.set(emailProvider, fakeEmailIntegration);
                    break;
                default:
                    throw new Error("Unsupported email provider");
            }
        }
    }

    async sendEmail(email: Email): Promise<void> {
        const errors = [];
        for (const emailIntegration of this.emailProviders.values()) {
            try {
                await emailIntegration.sendEmail(email);
                return;
            } catch (error) {
                errors.push(error);
            }
        }
        throw new Error("Unable to send email on any integration\n" + errors);
    }


    async sendTemplatedEmail(email: TemplatedEmail): Promise<void> {
        const errors = [];
        for (const emailIntegration of this.emailProviders.values()) {
            try {
                await emailIntegration.sendTemplatedEmail(email);
                return;
            } catch (error) {
                errors.push(error);
            }
        }
        throw new Error("Unable to send email on any integration\n" + errors);
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

    async createTemplate(emailProvider: EmailProvider, template: Template, updateIfExists: boolean): Promise<void> {
        if (!this.emailProviders.has(emailProvider)) {
            throw new Error("Creating template for Email provider which does not exist");
        }
        return this.emailProviders.get(emailProvider).createTemplate(template, updateIfExists);
    }

    async deleteTemplate(emailProvider: EmailProvider, templateName: string): Promise<void> {
        if (!this.emailProviders.has(emailProvider)) {
            throw new Error("Deleting template for Email provider which does not exist");
        }
        return this.emailProviders.get(emailProvider).deleteTemplate(templateName);
    }

    async updateTemplate(emailProvider: EmailProvider, template: Template): Promise<void> {
        if (!this.emailProviders.has(emailProvider)) {
            throw new Error("Creating template for Email provider which does not exist");
        }
        return this.emailProviders.get(emailProvider).updateTemplate(template);
    }
}