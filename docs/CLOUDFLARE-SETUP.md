# Cloudflare setup for Folio Studio

You can edit and build locally without a Cloudflare account. Follow these steps when you are ready to publish. Dashboard labels may change; the official references below describe the underlying settings.

## 1. Create or choose your account

1. Sign in at [Cloudflare](https://dash.cloudflare.com/) or create an account and verify your email.
2. Enable two-factor authentication for your Cloudflare login.
3. Choose the account that will own the portfolio. A custom domain is optional: Pages supplies a public `pages.dev` address.
4. If your domain was bought through Cloudflare, use the account that owns that domain. Its DNS is already managed there.

## 2. Initialize a Pages project

Skip this section if you already have a Pages project.

1. In the account dashboard, open **Workers & Pages → Create application**.
2. Choose **Pages**, then **Direct Upload / Upload assets**. If the screen initially offers a Worker, switch to the Pages creation option.
3. Choose a project name such as `artist-portfolio`. Record this exact name; it is the name you will enter in Folio Studio.
4. Upload the `examples/cloudflare-placeholder` folder supplied with this application. It contains an `index.html` file at its root, so the upload screen has something to deploy.
5. Click **Deploy** and open the resulting `pages.dev` link. This placeholder is public immediately.
6. Check that the project's production branch is `main`; Folio Studio deploys to `main`.

Folio Studio builds on your computer and uploads the result. You do not need to connect the application's GitHub repository to Pages. A Direct Upload project cannot later be converted to Git integration; that requires a new project. See [Cloudflare Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/).

## 3. Find your account ID and project name

1. Open your domain's **Overview** in Cloudflare.
2. Find the **API** section, usually on the right, and copy **Account ID**. Do not copy Zone ID. The account ID is 32 hexadecimal characters. If you have no domain, copy the account ID from the account dashboard or the Pages project's account information.
3. Open **Workers & Pages** and copy your Pages project's exact name, such as `artist-portfolio`. Do not enter the domain, full URL, or a deployment ID.

Cloudflare documents the account ID location in its [Pages credentials guide](https://developers.cloudflare.com/pages/how-to/use-direct-upload-with-continuous-integration/).

## 4. Create the publishing API token

Use an **API token**, not your Global API Key.

1. Open **API Tokens** in your Cloudflare profile, or **Account API tokens** for the selected account.
2. Click **Create Token → Custom token → Get started**.
3. Name it `Folio Studio Publisher`.
4. Add this permission:

   | Scope | Service | Permission |
   | --- | --- | --- |
   | Account | Cloudflare Pages | Edit |

5. Under **Account Resources**, choose **Include → Specific account → your portfolio account**. Do not choose all accounts.
6. Do not add DNS, billing, Workers, or administrator permissions for normal publishing.
7. Optionally set an expiration date. Record when it expires: publishing stops until you replace it. IP filtering is useful only if your public IP remains stable; changing ISP addresses or VPNs can prevent deployment.
8. Review the summary, create the token, and copy it into Folio Studio Settings. Cloudflare shows the token secret once. Do not paste it into GitHub, issues, screenshots, or chat.

The required permission is documented in [Cloudflare's Pages upload guide](https://developers.cloudflare.com/pages/how-to/use-direct-upload-with-continuous-integration/); resource scoping and optional restrictions are documented in [Create API token](https://developers.cloudflare.com/fundamentals/api/get-started/create-token/).

**Risk: Pages Edit is powerful.** A stolen token can publish unwanted content and edit or delete Pages projects within the permitted account. This permission is scoped to an account, not just the project name you enter in this app. Use a separate account if you need to isolate the portfolio from other sensitive Pages projects. See [Cloudflare's permission definitions](https://developers.cloudflare.com/fundamentals/api/reference/permissions/).

### Optional API access for DNS administration

The editor currently publishes to an existing project; configure custom domains in the Cloudflare dashboard using section 6. This does **not** require adding DNS rights to the app's token.

If you separately authorize API-based DNS setup or diagnosis, add **Zone → DNS → Edit** and **Zone → Zone → Read**, with **Zone Resources → Include → Specific zone → your exact domain**. Keep Account Pages Edit scoped as above. Do not grant access to all zones.

**Risk: DNS Edit can redirect your website, interfere with mail delivery, and break domain verification.** Only grant it when needed, and remove it afterward or use a separate temporary token. Never delete existing MX or TXT records just to connect a portfolio subdomain.

## 5. Save settings and publish

1. Open Folio Studio from the desktop shortcut.
2. Click **Settings** and enter **Account ID**, **Pages project name**, and **API token**.
3. Click **Save settings**. On Windows, settings are encrypted with the current user's Windows DPAPI and saved in `data/credentials.dat`. You do not need an `.env` file.
4. If you already have a legacy `.env`, saving imports its Cloudflare values and removes those three entries only after encrypted storage is verified. Leave the token field blank to retain an existing token.
5. Edit your pages, click **Build site**, and check the local desktop and mobile previews.
6. Click **Publish**, wait for success, then open the deployment link and check the actual public site.

**Publishing makes the site's content public** and updates the configured production project. Check that you selected the correct account and project. Published artwork includes web images and full-size web copies; keep private images out of your pages. Original uploads and saved credentials are not included in the site export.

## 6. Connect a custom subdomain

For example, to publish at `gallery.mirandafreestone.com`:

1. Open your Pages project in **Workers & Pages**.
2. Open **Custom domains → Set up a custom domain**.
3. Enter `gallery.mirandafreestone.com`, check its spelling, and continue.
4. When the domain is in this Cloudflare account, follow the prompt to create its DNS record. If asked to do this manually, create a **CNAME** named `gallery` pointing to the project's `pages.dev` hostname, without `https://` or a path.
5. If an A, AAAA, or CNAME already uses that exact name, review what it serves before replacing it. Leave unrelated website and mail records alone.
6. Wait until Pages reports the domain active and HTTPS is provisioned, then visit `https://gallery.mirandafreestone.com/`.
7. Repeat for other desired subdomains. Domains connected to the same Pages project serve that same site's content; independently published portfolios need separate projects.

Register the custom domain in **Pages first**. Adding only a DNS CNAME can produce a 522 error. See [Cloudflare custom domain setup](https://developers.cloudflare.com/pages/configuration/custom-domains/).

## 7. Protect, rotate, and revoke credentials

- Windows encryption protects the stored file at rest. Malware or another process running as your Windows user can request decryption; it does not protect a compromised computer. Keep Windows updated and use a separate Windows login on shared computers. [Microsoft DPAPI documentation](https://learn.microsoft.com/en-us/windows/win32/api/dpapi/nf-dpapi-cryptprotectdata).
- Download and run this application's installer only from a source you trust. It executes application code and downloads runtimes and dependencies. It installs private Python and Node copies without requiring administrator access or changing system installations; installation requires internet access. Official Python and Node archives are checked against pinned SHA-256 hashes.
- Back up artwork and project data. On a different computer or Windows account, re-enter Cloudflare credentials rather than relying on the encrypted file being transferable.
- To rotate: create a replacement token with the same limited scope, save it in Settings, verify publishing, then revoke the old token in Cloudflare.
- If a token is exposed, revoke it immediately in **API Tokens**, inspect deployments and DNS if applicable, then create a replacement.
- Deleting the local credential file does **not** revoke the token. Revoking a token stops its future API access; it does **not** remove an already published website.
- Advanced users can supply environment variables. Nonempty process environment values override encrypted settings, which override a legacy `.env`. Environment variables and `.env` values may be readable as plaintext: the normal Windows Settings workflow avoids requiring these files.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| 401/403 or authentication failure | Token expiration, Account Pages Edit, selected account scope, and correct Account ID. |
| Project not found | Initialize a Pages project first; enter its exact project name and owning account. |
| Subdomain fails or returns 522 | Add it under Pages Custom domains first, then check its CNAME and conflicting records. |
| HTTPS not ready | Check Custom domains status and certificate provisioning in Cloudflare. |
| Saved credentials cannot be read | Re-enter account, project and a token under your current Windows login. |
| Installer or startup fails | Rerun Install.cmd with internet access. Startup logs are in the installed app's `data/app.log` and `data/error.log`. |

Never include a token or an `.env` file when reporting an issue.
