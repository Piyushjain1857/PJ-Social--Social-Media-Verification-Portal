/**
 * Reusable HTML Email Templates for Social Media Activity Verification Portal
 * Bulletproof, inline-CSS email layouts compatible with Gmail, mobile & desktop clients.
 */

const PORTAL_NAME = 'PJ Social Media Verification Portal';
const PORTAL_URL = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',')[0] : 'http://localhost:5173';

/**
 * Base Email Layout Wrapper
 */
const baseLayout = ({ title, preheader, content, callToAction }) => {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${title || PORTAL_NAME}</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td, a { font-family: Arial, Helvetica, sans-serif !important; }
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; color: #1e293b;">
  ${preheader ? `<div style="display: none; max-height: 0px; overflow: hidden; mso-hide: all;">${preheader}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>` : ''}
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #0f172a; padding: 30px 10px;">
    <tr>
      <td align="center">
        <!-- Main Container Card -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 14px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.3); border: 1px solid #e2e8f0;">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%); padding: 32px 30px; text-align: center;">
              <div style="display: inline-block; padding: 6px 14px; background-color: rgba(255,255,255,0.12); border-radius: 20px; font-size: 11px; font-weight: 700; color: #a5b4fc; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 12px; border: 1px solid rgba(255,255,255,0.18);">
                🛡️ Verified Activity Network
              </div>
              <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 800; letter-spacing: -0.5px; line-height: 1.3;">
                ${PORTAL_NAME}
              </h1>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 36px 32px 28px 32px; background-color: #ffffff;">
              ${content}

              ${callToAction ? `
              <div style="text-align: center; margin: 32px 0 16px 0;">
                <a href="${callToAction.url}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #4f46e5 0%, #4338ca 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.35); text-align: center;" target="_blank">
                  ${callToAction.text} &rarr;
                </a>
              </div>
              ` : ''}
            </td>
          </tr>

          <!-- Security & Help Notice -->
          <tr>
            <td style="padding: 0 32px 24px 32px;">
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 16px; font-size: 12px; color: #64748b; line-height: 1.5;">
                🔒 <strong>Security Notice:</strong> PJ Social administrators will never ask for your password via email. If this event was not initiated by you, please secure your account immediately.
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f1f5f9; padding: 24px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0 0 8px 0; font-size: 13px; font-weight: 600; color: #334155;">
                PJ Social Media Activity Verification Portal
              </p>
              <p style="margin: 0 0 12px 0; font-size: 11px; color: #64748b; line-height: 1.4;">
                Institutional Proof Verification, Automated Gamification, and Creator Trust Engine.<br>
                All actions are protected by strict server-side role validation.
              </p>
              <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                &copy; ${new Date().getFullYear()} PJ Social Portal. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

/**
 * 1. Account Created Welcome Template
 */
const getAccountCreatedTemplate = ({
  name,
  email,
  role = 'USER',
  createdAt = new Date(),
  portalUrl = PORTAL_URL,
  loginUrl = `${PORTAL_URL}/login`
}) => {
  const formattedDate = createdAt ? new Date(createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }) : new Date().toLocaleDateString('en-US');

  const content = `
    <h2 style="margin: 0 0 16px 0; color: #0f172a; font-size: 20px; font-weight: 700;">
      Welcome to the Portal, ${name || 'Creator'}! 🎉
    </h2>
    <p style="margin: 0 0 16px 0; color: #334155; font-size: 15px; line-height: 1.6;">
      Your account on the <strong>Social Media Activity Verification Portal</strong> has been successfully created. You can now submit activity proof for official campaigns, earn verified institutional XP, climb the leaderboard, and unlock verified milestones!
    </p>

    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin: 20px 0; padding: 14px 18px;">
      <tr>
        <td style="padding: 6px 0; font-size: 13px; color: #64748b; width: 130px;"><strong>Full Name:</strong></td>
        <td style="padding: 6px 0; font-size: 13px; color: #1e293b; font-weight: 600;">${name || 'N/A'}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; font-size: 13px; color: #64748b;"><strong>Account Email:</strong></td>
        <td style="padding: 6px 0; font-size: 13px; color: #1e293b; font-weight: 600;">${email}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; font-size: 13px; color: #64748b;"><strong>Account Role:</strong></td>
        <td style="padding: 6px 0; font-size: 13px; color: #4338ca; font-weight: 700;">${role}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; font-size: 13px; color: #64748b;"><strong>Creation Date:</strong></td>
        <td style="padding: 6px 0; font-size: 13px; color: #1e293b;">${formattedDate}</td>
      </tr>
    </table>

    <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 14px 16px; margin: 18px 0; border-radius: 4px;">
      <p style="margin: 0; font-size: 12px; color: #92400e; line-height: 1.5;">
        🔒 <strong>Important Security Reminder:</strong> Never share your password with anyone. PJ Social Portal administrators will NEVER request your password via email, phone, or direct message.
      </p>
    </div>

    <p style="margin: 0 0 16px 0; color: #334155; font-size: 14px; line-height: 1.6;">
      Click the button below to sign in and start verifying your institutional activity:
    </p>
  `;

  return baseLayout({
    title: `Welcome to ${PORTAL_NAME} 🎉`,
    preheader: `Welcome to PJ Social Portal! Your account for ${email} is ready.`,
    content,
    callToAction: {
      text: 'Sign In to Your Account',
      url: loginUrl
    }
  });
};

/**
 * 2. Login Notification Template
 */
const getLoginNotificationTemplate = ({ name, email, ip = 'Unknown', time = new Date().toUTCString(), userAgent = 'Web Browser' }) => {
  const content = `
    <h2 style="margin: 0 0 16px 0; color: #0f172a; font-size: 20px; font-weight: 700;">
      New Login Detected 🔐
    </h2>
    <p style="margin: 0 0 16px 0; color: #334155; font-size: 15px; line-height: 1.6;">
      Hello <strong>${name || 'User'}</strong>, a successful sign-in to your PJ Social Verification Portal account was detected.
    </p>

    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin: 20px 0; padding: 14px 18px;">
      <tr>
        <td style="padding: 6px 0; font-size: 13px; color: #64748b; width: 120px;"><strong>Account:</strong></td>
        <td style="padding: 6px 0; font-size: 13px; color: #1e293b; font-weight: 600;">${email}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; font-size: 13px; color: #64748b;"><strong>Time:</strong></td>
        <td style="padding: 6px 0; font-size: 13px; color: #1e293b;">${time}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; font-size: 13px; color: #64748b;"><strong>IP Address:</strong></td>
        <td style="padding: 6px 0; font-size: 13px; color: #1e293b;">${ip}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; font-size: 13px; color: #64748b;"><strong>Device / Client:</strong></td>
        <td style="padding: 6px 0; font-size: 13px; color: #1e293b;">${userAgent}</td>
      </tr>
    </table>

    <div style="background-color: #fff1f2; border-left: 4px solid #f43f5e; padding: 14px 16px; margin: 18px 0; border-radius: 4px;">
      <p style="margin: 0; font-size: 12px; color: #9f1239; line-height: 1.5;">
        ⚠️ <strong>Security Advice:</strong> If this wasn't you, someone may have unauthorized access to your credentials. Please secure your account immediately by changing your password.
      </p>
    </div>
  `;

  return baseLayout({
    title: 'Security Alert: New Sign-in - PJ Social Portal',
    preheader: `New login detected for ${email} at ${time}.`,
    content,
    callToAction: {
      text: 'Secure Your Account',
      url: `${PORTAL_URL}`
    }
  });
};

/**
 * 3. Password Changed Template
 */
const getPasswordChangedTemplate = ({ name, email, time = new Date().toUTCString(), ip = 'Unknown' }) => {
  const content = `
    <h2 style="margin: 0 0 16px 0; color: #0f172a; font-size: 20px; font-weight: 700;">
      Your password was changed successfully 🔑
    </h2>
    <p style="margin: 0 0 16px 0; color: #334155; font-size: 15px; line-height: 1.6;">
      Hello <strong>${name || 'User'}</strong>, this is an automated confirmation that your password for <strong>${email}</strong> has been updated.
    </p>

    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin: 18px 0; padding: 14px 18px;">
      <tr>
        <td style="padding: 6px 0; font-size: 13px; color: #64748b; width: 130px;"><strong>Account Email:</strong></td>
        <td style="padding: 6px 0; font-size: 13px; color: #1e293b; font-weight: 600;">${email}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; font-size: 13px; color: #64748b;"><strong>Date / Time:</strong></td>
        <td style="padding: 6px 0; font-size: 13px; color: #1e293b;">${time}</td>
      </tr>
      ${ip !== 'Unknown' ? `
      <tr>
        <td style="padding: 6px 0; font-size: 13px; color: #64748b;"><strong>Source IP:</strong></td>
        <td style="padding: 6px 0; font-size: 13px; color: #1e293b;">${ip}</td>
      </tr>` : ''}
    </table>

    <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
      <p style="margin: 0; font-size: 12px; color: #065f46; font-weight: 600;">
        ✓ Status: Active and Secured with bcrypt encryption.
      </p>
    </div>

    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px 16px; margin: 16px 0;">
      <p style="margin: 0; font-size: 12px; color: #64748b; line-height: 1.5;">
        🛡️ <strong>Security Advice:</strong> If you did not make this change, please contact an administrator immediately to freeze your account and prevent unauthorized access.
      </p>
    </div>
  `;

  return baseLayout({
    title: 'Password Changed - PJ Social Portal',
    preheader: `Your PJ Social Portal password was successfully updated.`,
    content,
    callToAction: {
      text: 'Sign In to Portal',
      url: `${PORTAL_URL}/login`
    }
  });
};

/**
 * 4. Password Reset Template
 */
const getPasswordResetTemplate = ({ name, email, resetLink, expiryTime = '1 hour' }) => {
  const content = `
    <h2 style="margin: 0 0 16px 0; color: #0f172a; font-size: 20px; font-weight: 700;">
      Password Reset Request 🔄
    </h2>
    <p style="margin: 0 0 16px 0; color: #334155; font-size: 15px; line-height: 1.6;">
      Hello <strong>${name || 'User'}</strong>, we received a request to reset the password for your account (<strong>${email}</strong>).
    </p>

    <p style="margin: 0 0 16px 0; color: #334155; font-size: 14px; line-height: 1.6;">
      To choose a new password, click the button below. This link is single-use and will automatically expire in <strong>${expiryTime}</strong>.
    </p>

    <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 14px 16px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 0; font-size: 12px; color: #92400e; line-height: 1.5;">
        🔒 <strong>Security Notice:</strong> If you did not request this password reset, no action is required. Your current password remains active and secure. Never forward this link to anyone.
      </p>
    </div>
  `;

  return baseLayout({
    title: 'Password Reset Request - PJ Social Portal',
    preheader: `Instructions to reset your password for ${email}.`,
    content,
    callToAction: {
      text: 'Reset Your Password',
      url: resetLink
    }
  });
};

/**
 * 5. Email Change Notifications
 */
const getEmailChangedOldAddressTemplate = ({ name, oldEmail, newEmail, date = new Date().toUTCString() }) => {
  const content = `
    <h2 style="margin: 0 0 16px 0; color: #0f172a; font-size: 20px; font-weight: 700;">
      Your account email was changed ⚠️
    </h2>
    <p style="margin: 0 0 16px 0; color: #334155; font-size: 15px; line-height: 1.6;">
      Hello <strong>${name || 'User'}</strong>, this is an important security notice that the primary email address for your PJ Social Verification Portal account has been changed.
    </p>

    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin: 18px 0; padding: 14px 18px;">
      <tr>
        <td style="padding: 6px 0; font-size: 13px; color: #64748b; width: 140px;"><strong>Previous Email:</strong></td>
        <td style="padding: 6px 0; font-size: 13px; color: #1e293b;">${oldEmail}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; font-size: 13px; color: #64748b;"><strong>New Primary Email:</strong></td>
        <td style="padding: 6px 0; font-size: 13px; color: #1e293b; font-weight: 600;">${newEmail}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; font-size: 13px; color: #64748b;"><strong>Change Date:</strong></td>
        <td style="padding: 6px 0; font-size: 13px; color: #1e293b;">${date}</td>
      </tr>
    </table>

    <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 14px 16px; margin: 18px 0; border-radius: 4px;">
      <p style="margin: 0; font-size: 12px; color: #991b1b; line-height: 1.5;">
        🚨 <strong>Security Advisory:</strong> If you did not authorize this change, your account may be compromised. Please contact system support immediately to restore your account.
      </p>
    </div>
  `;

  return baseLayout({
    title: 'Account Email Changed - PJ Social Portal',
    preheader: `Security Alert: The email address for your account was changed.`,
    content,
    callToAction: {
      text: 'Contact Portal Support',
      url: `${PORTAL_URL}`
    }
  });
};

const getEmailChangedNewAddressTemplate = ({ name, newEmail, date = new Date().toUTCString(), loginUrl = `${PORTAL_URL}/login` }) => {
  const content = `
    <h2 style="margin: 0 0 16px 0; color: #0f172a; font-size: 20px; font-weight: 700;">
      Your email has been added to the account ✅
    </h2>
    <p style="margin: 0 0 16px 0; color: #334155; font-size: 15px; line-height: 1.6;">
      Hello <strong>${name || 'User'}</strong>, this email address (<strong>${newEmail}</strong>) has been successfully verified and linked as the primary email for your PJ Social Verification Portal account.
    </p>

    <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 14px 18px; margin: 18px 0; border-radius: 4px;">
      <p style="margin: 0; font-size: 13px; color: #065f46; font-weight: 600;">
        ✓ Updated on: ${date}
      </p>
    </div>

    <p style="margin: 0 0 16px 0; color: #334155; font-size: 14px; line-height: 1.6;">
      You can now use this email to sign in and receive institutional verification notifications:
    </p>
  `;

  return baseLayout({
    title: 'Primary Email Confirmed - PJ Social Portal',
    preheader: `Your new email address has been added to your account.`,
    content,
    callToAction: {
      text: 'Sign In with New Email',
      url: loginUrl
    }
  });
};

/**
 * 6. Account Deactivation Template
 */
const getAccountDeactivatedTemplate = ({
  name,
  email,
  reason = 'Account suspended as per administrative review.',
  date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
  supportEmail = 'support@portal.com'
}) => {
  const content = `
    <h2 style="margin: 0 0 16px 0; color: #0f172a; font-size: 20px; font-weight: 700;">
      Your account has been deactivated 🚫
    </h2>
    <p style="margin: 0 0 16px 0; color: #334155; font-size: 15px; line-height: 1.6;">
      Hello <strong>${name || 'User'}</strong>, this is an official notice that your account for <strong>${email}</strong> has been deactivated on the PJ Social Verification Portal.
    </p>

    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin: 18px 0; padding: 14px 18px;">
      <tr>
        <td style="padding: 6px 0; font-size: 13px; color: #64748b; width: 130px;"><strong>Account:</strong></td>
        <td style="padding: 6px 0; font-size: 13px; color: #1e293b; font-weight: 600;">${email}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; font-size: 13px; color: #64748b;"><strong>Effective Date:</strong></td>
        <td style="padding: 6px 0; font-size: 13px; color: #1e293b;">${date}</td>
      </tr>
      ${reason ? `
      <tr>
        <td style="padding: 6px 0; font-size: 13px; color: #64748b;"><strong>Reason:</strong></td>
        <td style="padding: 6px 0; font-size: 13px; color: #991b1b; font-weight: 600;">${reason}</td>
      </tr>` : ''}
    </table>

    <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 14px 16px; margin: 18px 0;">
      <p style="margin: 0; font-size: 13px; color: #475569; line-height: 1.5;">
        If you believe this deactivation was performed in error or if you wish to appeal this decision, please contact administrative support at <strong>${supportEmail}</strong>.
      </p>
    </div>
  `;

  return baseLayout({
    title: 'Account Deactivated - PJ Social Portal',
    preheader: `Notice: Your PJ Social Portal account has been deactivated.`,
    content,
    callToAction: {
      text: 'Contact Support',
      url: `${PORTAL_URL}`
    }
  });
};

/**
 * 7. Account Reactivation Template
 */
const getAccountReactivatedTemplate = ({
  name,
  email,
  date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
  loginUrl = `${PORTAL_URL}/login`
}) => {
  const content = `
    <h2 style="margin: 0 0 16px 0; color: #0f172a; font-size: 20px; font-weight: 700;">
      Your account has been reactivated 🎉
    </h2>
    <p style="margin: 0 0 16px 0; color: #334155; font-size: 15px; line-height: 1.6;">
      Hello <strong>${name || 'User'}</strong>, we are pleased to inform you that your account for <strong>${email}</strong> has been successfully reactivated on the PJ Social Verification Portal.
    </p>

    <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 14px 18px; margin: 18px 0; border-radius: 4px;">
      <p style="margin: 0; font-size: 13px; color: #065f46; font-weight: 600;">
        ✓ Reactivated on: ${date} &bull; Full account privileges restored.
      </p>
    </div>

    <p style="margin: 0 0 16px 0; color: #334155; font-size: 14px; line-height: 1.6;">
      You can now log in to access your activity submissions, gamification standings, and institutional rewards:
    </p>
  `;

  return baseLayout({
    title: 'Account Reactivated - PJ Social Portal',
    preheader: `Good news! Your PJ Social Portal account has been reactivated.`,
    content,
    callToAction: {
      text: 'Sign In to Portal',
      url: loginUrl
    }
  });
};

/**
 * 5. Submission Approved Template
 */
/**
 * 5a. Submission Received Template (Optional email when user submits activity)
 */
const getSubmissionReceivedTemplate = ({
  name,
  submissionId,
  platform = 'INSTAGRAM',
  actionType = 'LIKE',
  status = 'PENDING',
  submissionDate = new Date(),
  portalUrl = PORTAL_URL
}) => {
  const formattedDate = submissionDate ? new Date(submissionDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }) : new Date().toLocaleDateString('en-US');

  const content = `
    <p style="margin: 0 0 12px 0; font-size: 15px; color: #334155;">Hi <strong>${name || 'Creator'}</strong>,</p>
    <h2 style="margin: 0 0 16px 0; color: #0f172a; font-size: 20px; font-weight: 700;">
      Your submission has been received.
    </h2>
    <p style="margin: 0 0 16px 0; color: #334155; font-size: 15px; line-height: 1.6;">
      Thank you for submitting your social media activity proof. It has been placed in the moderator verification queue.
    </p>

    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin: 18px 0; padding: 14px 18px;">
      <tr>
        <td style="padding: 6px 0; font-size: 13px; color: #64748b; width: 130px;"><strong>Submission ID:</strong></td>
        <td style="padding: 6px 0; font-size: 13px; color: #1e293b; font-family: monospace;">${submissionId || 'N/A'}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; font-size: 13px; color: #64748b;"><strong>Platform:</strong></td>
        <td style="padding: 6px 0; font-size: 13px; color: #1e293b; font-weight: 600;">${platform}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; font-size: 13px; color: #64748b;"><strong>Action:</strong></td>
        <td style="padding: 6px 0; font-size: 13px; color: #1e293b; font-weight: 600;">${actionType}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; font-size: 13px; color: #64748b;"><strong>Submission Date:</strong></td>
        <td style="padding: 6px 0; font-size: 13px; color: #1e293b;">${formattedDate}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; font-size: 13px; color: #64748b;"><strong>Current Status:</strong></td>
        <td style="padding: 6px 0; font-size: 13px; color: #d97706; font-weight: 700;">${status || 'PENDING'} (In Review)</td>
      </tr>
    </table>

    <p style="margin: 0 0 12px 0; color: #334155; font-size: 14px; line-height: 1.6;">
      An administrator will inspect your evidence shortly. You will receive an update once the review is completed.
    </p>
  `;

  return baseLayout({
    title: 'Your submission has been received. - PJ Social Portal',
    preheader: `Your ${platform} ${actionType} submission (${submissionId}) has been received.`,
    content,
    callToAction: {
      text: 'View Submission',
      url: `${portalUrl}`
    }
  });
};

/**
 * 5b. Submission Approved Template
 */
const getSubmissionApprovedTemplate = ({
  name,
  submissionId,
  platform = 'INSTAGRAM',
  actionType = 'LIKE',
  xpAwarded = 0,
  approvalDate = new Date(),
  currentLevel = 1,
  levelName = 'Active',
  portalUrl = PORTAL_URL
}) => {
  const formattedDate = approvalDate ? new Date(approvalDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }) : new Date().toLocaleDateString('en-US');

  const content = `
    <p style="margin: 0 0 12px 0; font-size: 15px; color: #334155;">Hi <strong>${name || 'Creator'}</strong>,</p>
    <h2 style="margin: 0 0 16px 0; color: #0f172a; font-size: 20px; font-weight: 700;">
      Your submission has been approved! 🎉
    </h2>
    <p style="margin: 0 0 16px 0; color: #334155; font-size: 15px; line-height: 1.6;">
      Your social media activity submission has been verified and approved by the moderation team.
    </p>

    <!-- Reward Badge -->
    <div style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border: 1px solid #a7f3d0; border-radius: 10px; padding: 20px; margin: 20px 0; text-align: center;">
      <div style="font-size: 13px; font-weight: 700; color: #047857; text-transform: uppercase; letter-spacing: 1px;">
        ${platform} &bull; ${actionType}
      </div>
      <div style="font-size: 34px; font-weight: 900; color: #065f46; margin: 6px 0;">
        +${xpAwarded} XP
      </div>
      <div style="font-size: 13px; color: #047857;">
        Current Level: <strong>${currentLevel}</strong> ${levelName ? `(${levelName})` : ''}
      </div>
    </div>

    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin: 16px 0; padding: 14px 18px;">
      <tr>
        <td style="padding: 6px 0; font-size: 13px; color: #64748b; width: 130px;"><strong>Submission ID:</strong></td>
        <td style="padding: 6px 0; font-size: 13px; color: #1e293b; font-family: monospace;">${submissionId || 'N/A'}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; font-size: 13px; color: #64748b;"><strong>Platform:</strong></td>
        <td style="padding: 6px 0; font-size: 13px; color: #1e293b; font-weight: 600;">${platform}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; font-size: 13px; color: #64748b;"><strong>Action:</strong></td>
        <td style="padding: 6px 0; font-size: 13px; color: #1e293b; font-weight: 600;">${actionType}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; font-size: 13px; color: #64748b;"><strong>Approval Date:</strong></td>
        <td style="padding: 6px 0; font-size: 13px; color: #1e293b;">${formattedDate}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; font-size: 13px; color: #64748b;"><strong>XP Earned:</strong></td>
        <td style="padding: 6px 0; font-size: 13px; color: #059669; font-weight: 700;">+${xpAwarded} XP</td>
      </tr>
    </table>

    <div style="background-color: #f1f5f9; border-radius: 6px; padding: 10px 14px; margin: 14px 0; font-size: 12px; color: #64748b;">
      ℹ️ <em>Verification is strictly approved for the verified activity proof evaluated by the administrator.</em>
    </div>
  `;

  return baseLayout({
    title: 'Your submission has been approved! 🎉 - PJ Social Portal',
    preheader: `Your ${platform} ${actionType} proof was approved (+${xpAwarded} XP awarded)!`,
    content,
    callToAction: {
      text: 'View Dashboard',
      url: `${portalUrl}`
    }
  });
};

/**
 * 6. Submission Rejected Template
 */
const getSubmissionRejectedTemplate = ({
  name,
  submissionId,
  platform = 'INSTAGRAM',
  actionType = 'LIKE',
  reason,
  date = new Date(),
  portalUrl = PORTAL_URL
}) => {
  const formattedDate = date ? new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }) : new Date().toLocaleDateString('en-US');

  const content = `
    <p style="margin: 0 0 12px 0; font-size: 15px; color: #334155;">Hi <strong>${name || 'Creator'}</strong>,</p>
    <h2 style="margin: 0 0 16px 0; color: #0f172a; font-size: 20px; font-weight: 700;">
      Your submission was rejected.
    </h2>
    <p style="margin: 0 0 16px 0; color: #334155; font-size: 15px; line-height: 1.6;">
      Our moderation team has inspected your submission for <strong>${platform} (${actionType})</strong> and could not approve it.
    </p>

    ${reason ? `
    <!-- Moderator Feedback Box (Exposes reason only, never internal notes) -->
    <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 16px 18px; margin: 18px 0; border-radius: 4px;">
      <div style="font-size: 12px; font-weight: 700; color: #991b1b; text-transform: uppercase; margin-bottom: 4px;">
        Reason provided by moderator:
      </div>
      <div style="font-size: 14px; color: #7f1d1d; line-height: 1.5;">
        "${reason}"
      </div>
    </div>
    ` : ''}

    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin: 16px 0; padding: 14px 18px;">
      <tr>
        <td style="padding: 6px 0; font-size: 13px; color: #64748b; width: 130px;"><strong>Submission ID:</strong></td>
        <td style="padding: 6px 0; font-size: 13px; color: #1e293b; font-family: monospace;">${submissionId || 'N/A'}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; font-size: 13px; color: #64748b;"><strong>Platform:</strong></td>
        <td style="padding: 6px 0; font-size: 13px; color: #1e293b;">${platform}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; font-size: 13px; color: #64748b;"><strong>Action:</strong></td>
        <td style="padding: 6px 0; font-size: 13px; color: #1e293b;">${actionType}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; font-size: 13px; color: #64748b;"><strong>Date:</strong></td>
        <td style="padding: 6px 0; font-size: 13px; color: #1e293b;">${formattedDate}</td>
      </tr>
    </table>

    <p style="margin: 0 0 12px 0; color: #334155; font-size: 14px; line-height: 1.6;">
      You may review our guidelines and submit an updated activity verification proof at any time.
    </p>
  `;

  return baseLayout({
    title: 'Your submission was rejected. - PJ Social Portal',
    preheader: `Your ${platform} submission (${submissionId}) was rejected.`,
    content,
    callToAction: {
      text: 'View Submission',
      url: `${portalUrl}`
    }
  });
};

/**
 * 7. Clarification Request Template
 */
const getClarificationTemplate = ({
  name,
  submissionId,
  platform = 'INSTAGRAM',
  actionType = 'LIKE',
  message,
  reviewerName = 'Moderation Team',
  portalUrl = PORTAL_URL
}) => {
  const content = `
    <p style="margin: 0 0 12px 0; font-size: 15px; color: #334155;">Hi <strong>${name || 'Creator'}</strong>,</p>
    <h2 style="margin: 0 0 16px 0; color: #0f172a; font-size: 20px; font-weight: 700;">
      Additional information is required.
    </h2>
    <p style="margin: 0 0 16px 0; color: #334155; font-size: 15px; line-height: 1.6;">
      An administrator reviewing your <strong>${platform} (${actionType})</strong> submission has requested additional information before a verification decision can be completed.
    </p>

    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin: 16px 0; padding: 14px 18px;">
      <tr>
        <td style="padding: 6px 0; font-size: 13px; color: #64748b; width: 140px;"><strong>Submission ID:</strong></td>
        <td style="padding: 6px 0; font-size: 13px; color: #1e293b; font-family: monospace;">${submissionId || 'N/A'}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; font-size: 13px; color: #64748b;"><strong>Platform:</strong></td>
        <td style="padding: 6px 0; font-size: 13px; color: #1e293b; font-weight: 600;">${platform}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; font-size: 13px; color: #64748b;"><strong>Action:</strong></td>
        <td style="padding: 6px 0; font-size: 13px; color: #1e293b; font-weight: 600;">${actionType}</td>
      </tr>
    </table>

    <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 16px 18px; margin: 18px 0; border-radius: 4px;">
      <div style="font-size: 12px; font-weight: 700; color: #92400e; text-transform: uppercase; margin-bottom: 4px;">
        What information is needed:
      </div>
      <div style="font-size: 14px; color: #78350f; line-height: 1.5;">
        "${message || 'Please provide additional context or an updated screenshot for your activity.'}"
      </div>
    </div>

    <p style="margin: 0 0 12px 0; color: #334155; font-size: 14px; line-height: 1.6;">
      Please click below to open your submission and respond with the requested details:
    </p>
  `;

  return baseLayout({
    title: 'Additional information is required. - PJ Social Portal',
    preheader: `Additional information is required for your ${platform} submission (${submissionId}).`,
    content,
    callToAction: {
      text: 'View Submission',
      url: `${portalUrl}`
    }
  });
};

/**
 * 8. XP Earned Template
 */
const getXPEarnedTemplate = ({
  name,
  xpAmount = 0,
  reason = 'Approved Activity',
  totalXP = 0,
  currentLevel = 1,
  portalUrl = PORTAL_URL
}) => {
  const isPositive = xpAmount >= 0;
  const content = `
    <p style="margin: 0 0 12px 0; font-size: 15px; color: #334155;">Hi <strong>${name || 'Creator'}</strong>,</p>
    <h2 style="margin: 0 0 16px 0; color: #0f172a; font-size: 20px; font-weight: 700;">
      ⚡ You earned XP!
    </h2>
    <p style="margin: 0 0 16px 0; color: #334155; font-size: 15px; line-height: 1.6;">
      Your verified activity points have been successfully awarded to your account.
    </p>

    <!-- Big XP Award Box -->
    <div style="background: linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%); border: 1px solid #ddd6fe; border-radius: 12px; padding: 24px; margin: 20px 0; text-align: center;">
      <div style="font-size: 38px; font-weight: 900; color: #5b21b6; margin: 4px 0;">
        ${isPositive ? `+${xpAmount}` : `${xpAmount}`} XP
      </div>
      <div style="font-size: 14px; color: #6d28d9; font-weight: 600; margin-top: 4px;">
        Reason: <strong>${reason}</strong>
      </div>
    </div>

    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin: 16px 0; padding: 14px 18px;">
      <tr>
        <td style="padding: 6px 0; font-size: 13px; color: #64748b; width: 130px;"><strong>XP Awarded:</strong></td>
        <td style="padding: 6px 0; font-size: 13px; color: #5b21b6; font-weight: 700;">+${xpAmount} XP</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; font-size: 13px; color: #64748b;"><strong>Reason:</strong></td>
        <td style="padding: 6px 0; font-size: 13px; color: #1e293b; font-weight: 600;">${reason}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; font-size: 13px; color: #64748b;"><strong>Total XP:</strong></td>
        <td style="padding: 6px 0; font-size: 13px; color: #1e293b; font-weight: 700;">${totalXP.toLocaleString()}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; font-size: 13px; color: #64748b;"><strong>Current Level:</strong></td>
        <td style="padding: 6px 0; font-size: 13px; color: #4338ca; font-weight: 700;">${currentLevel}</td>
      </tr>
    </table>
  `;

  return baseLayout({
    title: '⚡ You earned XP! - PJ Social Portal',
    preheader: `You earned +${xpAmount} XP! Total XP: ${totalXP.toLocaleString()}`,
    content,
    callToAction: {
      text: 'View Dashboard',
      url: `${portalUrl}`
    }
  });
};

const getXPNotificationTemplate = getXPEarnedTemplate;

/**
 * 9. Level Up Template
 */
const getLevelUpTemplate = ({
  name,
  previousLevel = 1,
  newLevel = 2,
  levelName = 'Active',
  totalXP = 0,
  icon = '🏆',
  portalUrl = PORTAL_URL
}) => {
  const content = `
    <p style="margin: 0 0 12px 0; font-size: 15px; color: #334155;">Hi <strong>${name || 'Creator'}</strong>,</p>
    <h2 style="margin: 0 0 16px 0; color: #0f172a; font-size: 22px; font-weight: 800; text-align: center;">
      🏆 LEVEL UP!
    </h2>
    <p style="margin: 0 0 20px 0; color: #334155; font-size: 15px; line-height: 1.6; text-align: center;">
      Congratulations! Your verified engagement has unlocked a higher tier!
    </p>

    <!-- Level Celebration Banner -->
    <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 50%, #f59e0b 100%); border-radius: 12px; padding: 26px 20px; margin: 20px 0; text-align: center; box-shadow: 0 6px 18px rgba(245, 158, 11, 0.25);">
      <div style="font-size: 44px; margin-bottom: 6px;">
        ${icon || '🏆'}
      </div>
      <div style="font-size: 24px; font-weight: 900; color: #451a03; margin: 6px 0;">
        Level ${previousLevel} &rarr; Level ${newLevel}
      </div>
      <div style="font-size: 16px; font-weight: 800; color: #78350f; text-transform: uppercase; letter-spacing: 1px;">
        ${levelName}
      </div>
      <div style="font-size: 14px; font-weight: 700; color: #78350f; margin-top: 8px;">
        Current XP: ${totalXP.toLocaleString()}
      </div>
    </div>

    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin: 16px 0; padding: 14px 18px;">
      <tr>
        <td style="padding: 6px 0; font-size: 13px; color: #64748b; width: 130px;"><strong>Previous Level:</strong></td>
        <td style="padding: 6px 0; font-size: 13px; color: #1e293b;">Level ${previousLevel}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; font-size: 13px; color: #64748b;"><strong>New Level:</strong></td>
        <td style="padding: 6px 0; font-size: 13px; color: #4338ca; font-weight: 700;">Level ${newLevel}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; font-size: 13px; color: #64748b;"><strong>Level Name:</strong></td>
        <td style="padding: 6px 0; font-size: 13px; color: #1e293b; font-weight: 600;">${levelName}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; font-size: 13px; color: #64748b;"><strong>Current XP:</strong></td>
        <td style="padding: 6px 0; font-size: 13px; color: #1e293b; font-weight: 700;">${totalXP.toLocaleString()}</td>
      </tr>
    </table>
  `;

  return baseLayout({
    title: '🏆 LEVEL UP! - PJ Social Portal',
    preheader: `🏆 LEVEL UP: Level ${previousLevel} → Level ${newLevel} (${levelName}) with ${totalXP.toLocaleString()} XP!`,
    content,
    callToAction: {
      text: 'View Dashboard',
      url: `${portalUrl}`
    }
  });
};

/**
 * 10. Test Email Template (for Super Admin API verification)
 */
const getTestEmailTemplate = ({ recipient, timestamp = new Date().toISOString(), host = 'smtp.gmail.com' }) => {
  const content = `
    <h2 style="margin: 0 0 16px 0; color: #0f172a; font-size: 20px; font-weight: 700;">
      ✅ Transactional Email System Operational
    </h2>
    <p style="margin: 0 0 16px 0; color: #334155; font-size: 15px; line-height: 1.6;">
      This is an official test email dispatched by a <strong>Super Administrator</strong> from the <strong>PJ Social Media Activity Verification Portal</strong> backend.
    </p>

    <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 16px 20px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 0 0 6px 0; font-size: 13px; font-weight: 700; color: #065f46;">Telemetry & Verification Status:</p>
      <p style="margin: 0 0 4px 0; font-size: 13px; color: #047857;"><strong>Target Recipient:</strong> ${recipient}</p>
      <p style="margin: 0 0 4px 0; font-size: 13px; color: #047857;"><strong>Dispatched At:</strong> ${timestamp}</p>
      <p style="margin: 0; font-size: 13px; color: #047857;"><strong>SMTP Transporter:</strong> ${host}</p>
    </div>

    <p style="margin: 0 0 12px 0; color: #475569; font-size: 13px; line-height: 1.6;">
      If you received this message, the email pipeline, HTML templates, and delivery logging mechanisms are functioning as expected.
    </p>
  `;

  return baseLayout({
    title: 'Test Email Verification - PJ Social Portal',
    preheader: `Test transactional email from PJ Social Verification Portal.`,
    content,
    callToAction: {
      text: 'Open Super Admin Console',
      url: `${PORTAL_URL}`
    }
  });
};

module.exports = {
  PORTAL_NAME,
  PORTAL_URL,
  baseLayout,
  getAccountCreatedTemplate,
  getLoginNotificationTemplate,
  getPasswordChangedTemplate,
  getPasswordResetTemplate,
  getEmailChangedOldAddressTemplate,
  getEmailChangedNewAddressTemplate,
  getAccountDeactivatedTemplate,
  getAccountReactivatedTemplate,
  getSubmissionReceivedTemplate,
  getSubmissionApprovedTemplate,
  getSubmissionRejectedTemplate,
  getClarificationTemplate,
  getXPEarnedTemplate,
  getXPNotificationTemplate,
  getLevelUpTemplate,
  getTestEmailTemplate
};
