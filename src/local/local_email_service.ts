import { Email } from '../model/email';
import { Template } from '../model/template';
import { TemplatedEmail } from '../model/templated_email';
import { EmailIntegration, EmailProviderConfiguration } from '../service/email_service';
import * as fs from 'fs';

/**
 * Custom configuration for Local.
 */
export class LocalConfiguration extends EmailProviderConfiguration {
    readonly outputFile?: string;
    constructor(outputFile?: string) {
        super();
        this.outputFile = outputFile;
    }
}

export class LocalEmailIntegration implements EmailIntegration {

    readonly templates: Map<string, Template> = new Map();
    private localConfiguration: LocalConfiguration;

    constructor(emailProviderConfiguration: EmailProviderConfiguration) {
        if (emailProviderConfiguration instanceof LocalConfiguration) {
            this.localConfiguration = emailProviderConfiguration;
        }
    }

    async sendEmail(email: Email): Promise<void> {
        this.saveLog("SENDING EMAIL:")
        this.saveLog("To: " + email.toEmailAddresses);
        this.saveLog("CC: " + email.ccEmailAddresses);
        this.saveLog("BCC: " + email.bccEmailAddresses);
        this.saveLog("Reply To: " + email.replyToEmailAddresses);
        this.saveLog("Subject: " + email.subject);
        this.saveLog("Text Body: " + email.textBody);
        this.saveLog("HTML Body: " + email.htmlBody);
    }

    async sendTemplatedEmail(email: TemplatedEmail): Promise<void> {
        if (!this.templates.has(email.templateName)) {
            throw "No template exists for " + email.templateName;
        }
        this.saveLog("SENDING TEMPLATED EMAIL:")
        this.saveLog("To: " + email.toEmailAddresses);
        this.saveLog("CC: " + email.ccEmailAddresses);
        this.saveLog("BCC: " + email.bccEmailAddresses);
        this.saveLog("Reply To: " + email.replyToEmailAddresses);
        const template = this.templates.get(email.templateName);
        this.saveLog("Subject: " + this.replaceString(template.subject, email.templateData));
        this.saveLog("Text Body: " + this.replaceString(template.textBody, email.templateData));
        this.saveLog("HTML Body: " + this.replaceString(template.htmlBody, email.templateData));
    }

    async sendBulkEmails(emails: Email[]): Promise<Map<Email, boolean>> {
        const results = new Map<Email, boolean>();
        await emails.map(async (email, index) => {
            try {
                this.saveLog(`Email ${index} of ${emails.length}`);
                await this.sendEmail(email);
                results.set(email, true);
            } catch (error) {
                results.set(email, false);
            }
        });
        return results;
    }

    async sendBulkTemplatedEmails(emails: TemplatedEmail[]): Promise<Map<TemplatedEmail, boolean>> {
        const results = new Map<TemplatedEmail, boolean>();
        await emails.map(async (email, index) => {
            try {
                this.saveLog(`Templated Email ${index} of ${emails.length}`);
                await this.sendTemplatedEmail(email);
                results.set(email, true);
            } catch (error) {
                results.set(email, false);
            }
        });
        return results;
    }

    async createTemplate(template: Template, updateIfExists: boolean): Promise<void> {
        if (!this.templates.has(template.templateName) || updateIfExists) {
            this.templates.set(template.templateName, template);
        }
    }

    async updateTemplate(template: Template): Promise<void> {
        if (!this.templates.has(template.templateName)) {
            throw "No template with the name " + template.templateName;
        }
        this.templates.set(template.templateName, template);
    }

    async deleteTemplate(templateName: string): Promise<void> {
        if (!this.templates.has(templateName)) {
            throw "No template with the name " + templateName;
        }
        this.templates.delete(templateName);
    }

    replaceString(input: string, templateData: string): string {
        const templateJson = JSON.parse(templateData);
        for (const [key, value] of Object.entries(templateJson)) {
            input = input.replace(new RegExp("{{" + key + "}}", "g"), value as string);
        }
        return input;
    }

    saveLog(message: string): void {
        if (this.localConfiguration instanceof LocalConfiguration) {
            const outputFile = this.localConfiguration.outputFile;
            if (outputFile) {
                // Check if the output file exists
                const fileExists = fs.existsSync(outputFile);
                if (!fileExists) {
                    // Create the output file if it doesn't exist
                    fs.writeFileSync(outputFile, '');
                }
                // Append to the output file if it exists
                fs.appendFileSync(outputFile, message + '\n');
            } else {
                console.log(message);
            }
        } else {
            console.log(message);
        }
    }
}