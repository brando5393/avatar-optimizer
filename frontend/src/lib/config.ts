// Public identifiers only — never a secret. The Turnstile secret key lives
// server-side in AWS Secrets Manager (see docs/architecture.md).
export const TURNSTILE_SITE_KEY = "0x4AAAAAAEmkybB8q61nQbu0";

// TODO: replace with the real value from the PicPerfectoContactStack
// "ContactFormUrl" CloudFormation output once that stack is deployed.
export const CONTACT_API_URL = "https://contact.picperfecto.com/";
