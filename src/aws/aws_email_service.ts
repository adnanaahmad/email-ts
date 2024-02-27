import * as AWS from "@aws-sdk/client-ses";

import { Email } from '../model/email';
import { Template } from '../model/template';
import { TemplatedEmail } from '../model/templated_email';
import { AwsConfiguration, EmailIntegration, EmailProviderConfiguration } from '../service/email_service';

import CreateTemplateRequest = AWS.CreateTemplateRequest;
import DeleteTemplateRequest = AWS.DeleteTemplateRequest;
import GetTemplateRequest = AWS.GetTemplateRequest;
import UpdateTemplateRequest = AWS.UpdateTemplateRequest;
import Destination = AWS.Destination;
import SendEmailRequest = AWS.SendEmailRequest;
import SendTemplatedEmailRequest = AWS.SendTemplatedEmailRequest;
import AwsTemplate = AWS.Template;
//import MessageTagList = AWS.MessageTagList;
import MessageTag = AWS.MessageTag;

// By default the values which will be used are from the environment variables
// See https://docs.aws.amazon.com/sdkref/latest/guide/settings-reference.html#EVarSettings
// for a full list of variables and what they control

export class AwsEmailIntegration implements EmailIntegration {

    private awsConfiguration?: AwsConfiguration;
    private ses: AWS.SES;

    constructor(emailProviderConfiguration: EmailProviderConfiguration) {
        if (emailProviderConfiguration instanceof AwsConfiguration) {
            this.awsConfiguration = emailProviderConfiguration;
        }
        this.ses = new AWS.SES({});
    }

    getConfigurationSetName(): string | undefined {
        if (this.awsConfiguration && this.awsConfiguration.configurationSetName) {
            return this.awsConfiguration.configurationSetName;
        }
        return undefined;
    }

    getMessageTags(): MessageTag[] | undefined {
        const messageTags: MessageTag[] = [];
        if (this.awsConfiguration && this.awsConfiguration.tags) {
            for (const [key, value] of this.awsConfiguration.tags.values()) {
                const messageTag: MessageTag = {
                    Name: key,
                    Value: value
                };
                messageTags.push(messageTag);
            }
            return messageTags;
        } else {
            return undefined;
        }
    }

    async sendEmail(email: Email): Promise<void> {
        if (email.numberOfRecipients() > 50) {
            throw new Error("Too many recipients. Use sendBulkEmails instead");
        }
        const destination: Destination = {
            ToAddresses: email.toEmailAddresses,
            CcAddresses: email.ccEmailAddresses,
            BccAddresses: email.bccEmailAddresses,
        };

        const params: SendEmailRequest = {
            Source: email.senderEmailAddress,
            Destination: destination,
            Message: {
                Subject: {
                    Data: email.subject,
                },
                Body: {
                    Text: {
                        Data: email.textBody,
                    },
                    Html: {
                        Data: email.htmlBody,
                    }
                }
            },
            ReplyToAddresses: email.replyToEmailAddresses,
            ConfigurationSetName: this.getConfigurationSetName(),
            Tags: this.getMessageTags(),
        };
        await this.ses.sendEmail(params);
    }

    async sendTemplatedEmail(email: TemplatedEmail): Promise<void> {
        const destination: Destination = {
            ToAddresses: email.toEmailAddresses,
            CcAddresses: email.ccEmailAddresses,
            BccAddresses: email.bccEmailAddresses,
        };

        const params: SendTemplatedEmailRequest = {
            Source: email.senderEmailAddress,
            Destination: destination,
            Template: email.templateName,
            TemplateData: email.templateData,
            ReplyToAddresses: email.replyToEmailAddresses,
            ConfigurationSetName: this.getConfigurationSetName(),
            Tags: this.getMessageTags(),
        };

        await this.ses.sendTemplatedEmail(params);
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
        await new Promise(resolve => setTimeout(resolve, 1000));
        const getTemplateRequest: GetTemplateRequest = {
            TemplateName: template.templateName
        };
        let templateExists: boolean;
        try {
            const response = await this.ses.getTemplate(getTemplateRequest);
            if (response.Template) {
                templateExists = true;
            } else {
                templateExists = false;
            }
        } catch (error) {
            templateExists = false;
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
        const awsTemplate: AwsTemplate = {
            TemplateName: template.templateName,
            SubjectPart: template.subject,
            HtmlPart: template.htmlBody,
            TextPart: template.textBody,
        };
        if (templateExists) {
            if (updateIfExists) {
                const request: UpdateTemplateRequest = {
                    Template: awsTemplate
                }
                await this.ses.updateTemplate(request);
            } else {
                return;
            }
        } else {
            const request: CreateTemplateRequest = {
                Template: awsTemplate
            };
            await this.ses.createTemplate(request);
        }
    }

    async updateTemplate(template: Template): Promise<void> {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const awsTemplate: AwsTemplate = {
            TemplateName: template.templateName,
            SubjectPart: template.subject,
            HtmlPart: template.htmlBody,
            TextPart: template.textBody,
        };
        const request: UpdateTemplateRequest = {
            Template: awsTemplate
        };
        await this.ses.updateTemplate(request);
    }

    async deleteTemplate(templateName: string): Promise<void> {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const request: DeleteTemplateRequest = {
            TemplateName: templateName
        };
        await this.ses.deleteTemplate(request);
    }
}