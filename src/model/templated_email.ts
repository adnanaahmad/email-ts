import { BaseEmail } from "./base_email";

export class TemplatedEmail extends BaseEmail {
    // Name of template to use
    readonly templateName: string;

    // Data to be used in template
    readonly templateData: string;

    constructor(
        senderEmailAddress: string,
        toEmailAddresses: string[],
        templateName: string,
        templateData: string,
        ccEmailAddresses?: string[],
        bccEmailAddresses?: string[],
        replyToEmailAddresses?: string[]) {
        super(senderEmailAddress, toEmailAddresses, ccEmailAddresses, bccEmailAddresses, replyToEmailAddresses);
        if (templateName.length == 0) {
            throw new Error("Please provide a valid template name");
        }
        this.templateName = templateName;
        this.templateData = templateData;
    }
}