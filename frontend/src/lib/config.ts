// Public identifiers only — never a secret. The Turnstile secret key lives
// server-side in AWS Secrets Manager (see docs/architecture.md).
export const TURNSTILE_SITE_KEY = "0x4AAAAAAEmkybB8q61nQbu0";

// PicPerfectoContactStack "ContactFormUrl" CloudFormation output.
export const CONTACT_API_URL = "https://ag33ssacezbctuhshf4iwjl3pq0rfbor.lambda-url.us-east-1.on.aws/";

// TODO: replace with the real values from PicPerfectoProcessingStack's
// "GenerateUploadUrlUrl" / "GetSessionUrl" CloudFormation outputs once that
// stack is deployed.
export const GENERATE_UPLOAD_URL_API = "https://upload.picperfecto.com/";
export const GET_SESSION_API = "https://session.picperfecto.com/";
