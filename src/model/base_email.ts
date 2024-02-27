const EMAIL_REGEX = new RegExp(/^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/);

export abstract class BaseEmail {
    /**
     * Addresses section
     */

    // Email address to use for sending the email
    readonly senderEmailAddress: string;

    // Email addresses to send the email to
    readonly toEmailAddresses: string[];

    // Email addresses to CC the email to
    readonly ccEmailAddresses?: string[];

    // Email addresses to BCC the email to
    readonly bccEmailAddresses?: string[];

    // Email addresses that will receive replies to this email
    readonly replyToEmailAddresses?: string[];

    constructor(
        senderEmailAddress: string,
        toEmailAddresses: string[],
        ccEmailAddresses?: string[],
        bccEmailAddresses?: string[],
        replyToEmailAddresses?: string[]) {
        if (!BaseEmail.validateEmail(senderEmailAddress)) {
            throw new Error("Invalid sender email address: " + senderEmailAddress);
        }
        const invalidToEmails = BaseEmail.validateEmails(toEmailAddresses);
        if (invalidToEmails.length != 0) {
            throw new Error("Invalid to email addresses: " + invalidToEmails.toString());
        }
        const invalidCcEmails = BaseEmail.validateEmails(ccEmailAddresses);
        if (invalidCcEmails.length != 0) {
            throw new Error("Invalid CC email addresses: " + invalidCcEmails.toString());
        }
        const invalidBccEmails = BaseEmail.validateEmails(bccEmailAddresses);
        if (invalidBccEmails.length != 0) {
            throw new Error("Invalid BCC email addresses: " + invalidBccEmails.toString());
        }
        const invalidReplyToEmails = BaseEmail.validateEmails(replyToEmailAddresses);
        if (invalidReplyToEmails.length != 0) {
            throw new Error("Invalid reply to email addresses: " + invalidReplyToEmails.toString());
        }
        this.senderEmailAddress = senderEmailAddress;
        this.toEmailAddresses = toEmailAddresses;
        this.ccEmailAddresses = ccEmailAddresses;
        this.bccEmailAddresses = bccEmailAddresses;
        this.replyToEmailAddresses = replyToEmailAddresses;
        if (this.numberOfRecipients() <= 0) {
            throw new Error("No recipients defined for email");
        }
    }

    numberOfRecipients(): number {
        let sum = this.toEmailAddresses ? this.toEmailAddresses.length : 0;
        sum += this.ccEmailAddresses ? this.ccEmailAddresses.length : 0;
        sum += this.bccEmailAddresses ? this.bccEmailAddresses.length : 0;
        return sum;
    }

    static validateEmail(emailAddress: string): boolean {
        return EMAIL_REGEX.test(emailAddress);
    }

    /**
     * Given a list of emails, returns all the invalid emails
     * @param emailAddresses The list of email addresses
     */
    static validateEmails(emailAddresses?: string[]): string[] {
        return emailAddresses == undefined ? [] : emailAddresses.filter(emailAddress => !BaseEmail.validateEmail(emailAddress));
    }
}