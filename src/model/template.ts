export class Template {
    // Name of template to use
    readonly templateName: string;

    // Subject of email
    readonly subject: string;

    // Body in HTML
    readonly htmlBody: string;

    // Body in text
    readonly textBody: string;

    constructor(templateName: string, subject: string, htmlBody: string, textBody: string) {
        if (templateName.length === 0 || subject.length === 0 || htmlBody.length === 0 || textBody.length === 0) {
            throw new Error("Please provide non-empty valuess for templateName, subject, htmlBody and textBody");
        }
        this.templateName = templateName;
        this.subject = subject;
        this.htmlBody = htmlBody;
        this.textBody = textBody;
    }
}