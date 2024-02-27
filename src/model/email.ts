import { BaseEmail } from "./base_email";

export class Email extends BaseEmail {
    // Subject of email
    readonly subject: string;

    // Body in HTML
    readonly htmlBody: string;

    // Body in text
    readonly textBody: string;

    constructor(
        senderEmailAddress: string,
        toEmailAddresses: string[],
        subject: string,
        htmlBody: string,
        textBody: string,
        ccEmailAddresses?: string[],
        bccEmailAddresses?: string[],
        replyToEmailAddresses?: string[]) {
        super(senderEmailAddress, toEmailAddresses, ccEmailAddresses, bccEmailAddresses, replyToEmailAddresses)
        if (subject.length == 0 || htmlBody.length == 0 || textBody.length == 0) {
            throw Error("Please provide non-empty arguments for subject, htmlBody and textBody");
        }
        this.subject = subject;
        this.htmlBody = htmlBody;
        this.textBody = textBody;
    }
}