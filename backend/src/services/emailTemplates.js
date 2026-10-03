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
const getAccountCreatedTemplate = ({ name, email, portalUrl = PORTAL_URL, loginUrl = `${PORTAL_URL}/login` }) => {
  const content = `
    <h2 style="margin: 0 0 16px 0; color: #0f172a; font-size: 20px; font-weight: 700;">
      Welcome to the Portal, ${name || 'Creator'}! 👋
    </h2>
    <p style="margin: 0 0 16px 0; color: #334155; font-size: 15px; line-height: 1.6;">
      Your account on the <strong>Social Media Activity Verification Portal</strong> has been successfully created. You can now submit activity proof for official campaigns, earn verified XP, climb the institutional leaderboard, and level up your profile!
    </p>

    <div style="background-color: #f8fafc; border-left: 4px solid #4f46e5; padding: 16px 20px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 0 0 6px 0; font-size: 13px; font-weight: 700; color: #1e293b;">Your Account Details:</p>
      <p style="margin: 0 0 4px 0; font-size: 13px; color: #475569;"><strong>Full Name:</strong> ${name || 'N/A'}</p>
      <p style="margin: 0; font-size: 13px; color: #475569;"><strong>Registered Email:</strong> ${email}</p>
    </div>

    <p style="margin: 0 0 16px 0; color: #334155; font-size: 14px; line-height: 1.6;">
      Click below to sign in and submit your first Instagram, LinkedIn, or Facebook activity proof:
    </p>
  `;

  return baseLayout({
    title: 'Account Created - PJ Social Portal',
    preheader: `Welcome to PJ Social Portal! Your account for ${email} is ready.`,
    content,
    callToAction: {
      text: 'Sign In to Your Dashboard',
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
      Hello <strong>${name || 'User'}</strong>, we detected a successful sign-in to your account on the PJ Social Verification Portal.
    </p>

    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin: 20px 0; padding: 14px 18px;">
      <tr>
        <td style="padding: 6px 0; font-size: 13px; color: #64748b; width: 120px;"><strong>Account:</strong></td>
        <td style="padding: 6px 0; font-size: 13px; color: #1e293b; font-weight: 600;">${email}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; font-size: 13px; color: #64748b;"><strong>Time (UTC):</strong></td>
        <td style="padding: 6px 0; font-size: 13px; color: #1e293b;">${time}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; font-size: 13px; color: #64748b;"><strong>IP Address:</strong></td>
        <td style="padding: 6px 0; font-size: 13px; color: #1e293b;">${ip}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; font-size: 13px; color: #64748b;"><strong>Client:</strong></td>
        <td style="padding: 6px 0; font-size: 13px; color: #1e293b;">${userAgent}</td>
      </tr>
    </table>

    <p style="margin: 0 0 12px 0; color: #475569; font-size: 13px; line-height: 1.6;">
      If this was you, you can safely disregard this message. If you do not recognize this activity, please change your password immediately.
    </p>
  `;

  return baseLayout({
    title: 'Security Alert: New Sign-in - PJ Social Portal',
    preheader: `New login detected for ${email} at ${time}.`,
    content,
    callToAction: {
      text: 'View Account Security',
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
      Password Changed Successfully 🔑
    </h2>
    <p style="margin: 0 0 16px 0; color: #334155; font-size: 15px; line-height: 1.6;">
      Hello <strong>${name || 'User'}</strong>, this is an automated confirmation that your password for <strong>${email}</strong> has just been updated.
    </p>

    <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 14px 18px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 0; font-size: 13px; color: #065f46; font-weight: 600;">
        ✓ Password updated on: ${time}
      </p>
    </div>

    <p style="margin: 0 0 16px 0; color: #334155; font-size: 14px; line-height: 1.6;">
      If you made this change, no further action is required. If you did <strong>not</strong> authorize this change, please contact an administrator immediately to suspend and recover your account.
    </p>
  `;

  return baseLayout({
    title: 'Password Updated - PJ Social Portal',
    preheader: `Your PJ Social Portal password was successfully changed.`,
    content,
    callToAction: {
      text: 'Go to Sign In',
      url: `${PORTAL_URL}/login`
    }
  });
};

/**
 * 4. Password Reset Template
 */
const getPasswordResetTemplate = ({ name, email, resetLink, temporaryPassword, expiryTime = '24 hours' }) => {
  const content = `
    <h2 style="margin: 0 0 16px 0; color: #0f172a; font-size: 20px; font-weight: 700;">
      Password Reset Request 🔄
    </h2>
    <p style="margin: 0 0 16px 0; color: #334155; font-size: 15px; line-height: 1.6;">
      Hello <strong>${name || 'User'}</strong>, we received a request to reset the password associated with your account (<strong>${email}</strong>).
    </p>

    ${temporaryPassword ? `
    <div style="background-color: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 16px 20px; text-align: center; margin: 20px 0;">
      <span style="font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 700; letter-spacing: 1px;">Temporary Password</span>
      <div style="font-size: 20px; font-family: monospace; font-weight: 800; color: #4338ca; margin-top: 8px;">
        ${temporaryPassword}
      </div>
      <p style="margin: 8px 0 0 0; font-size: 12px; color: #94a3b8;">Please change this password upon your next sign-in.</p>
    </div>
    ` : ''}

    <p style="margin: 0 0 16px 0; color: #334155; font-size: 14px; line-height: 1.6;">
      This security link is valid for <strong>${expiryTime}</strong>. If you did not request a password reset, you can safely ignore this email.
    </p>
  `;

  return baseLayout({
    title: 'Password Reset Request - PJ Social Portal',
    preheader: `Instructions to reset your PJ Social Portal password.`,
    content,
    callToAction: {
      text: 'Reset Your Password',
      url: resetLink || `${PORTAL_URL}/login`
    }
  });
};

/**
 * 5. Submission Approved Template
 */
const getSubmissionApprovedTemplate = ({
  name,
  submissionId,
  platform = 'INSTAGRAM',
  actionType = 'LIKE',
  xpAwarded = 0,
  totalXP = 0,
  levelName = 'Active',
  portalUrl = PORTAL_URL
}) => {
  const content = `
    <h2 style="margin: 0 0 16px 0; color: #0f172a; font-size: 20px; font-weight: 700;">
      🎉 Submission Approved!
    </h2>
    <p style="margin: 0 0 16px 0; color: #334155; font-size: 15px; line-height: 1.6;">
      Great job, <strong>${name || 'Creator'}</strong>! Your social media engagement proof has been reviewed and <strong style="color: #16a34a;">APPROVED</strong> by our moderation team.
    </p>

    <!-- Badge Card -->
    <div style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border: 1px solid #a7f3d0; border-radius: 10px; padding: 20px; margin: 22px 0; text-align: center;">
      <div style="font-size: 13px; font-weight: 700; color: #047857; text-transform: uppercase; letter-spacing: 1px;">
        Verified Reward
      </div>
      <div style="font-size: 32px; font-weight: 800; color: #065f46; margin: 6px 0;">
        +${xpAwarded} XP
      </div>
      <div style="font-size: 13px; color: #047857;">
        Total Balance: <strong>${totalXP} XP</strong> &bull; Current Tier: <strong>${levelName}</strong>
      </div>
    </div>

    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin: 16px 0; padding: 14px 18px;">
      <tr>
        <td style="padding: 6px 0; font-size: 13px; color: #64748b; width: 120px;"><strong>Submission ID:</strong></td>
        <td style="padding: 6px 0; font-size: 13px; color: #1e293b; font-family: monospace;">${submissionId || 'N/A'}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; font-size: 13px; color: #64748b;"><strong>Platform:</strong></td>
        <td style="padding: 6px 0; font-size: 13px; color: #1e293b; font-weight: 600;">${platform}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; font-size: 13px; color: #64748b;"><strong>Action Type:</strong></td>
        <td style="padding: 6px 0; font-size: 13px; color: #1e293b; font-weight: 600;">${actionType}</td>
      </tr>
    </table>

    <p style="margin: 0 0 12px 0; color: #334155; font-size: 14px; line-height: 1.6;">
      Keep engaging with institutional campaigns to earn more XP and climb to the top of the leaderboard!
    </p>
  `;

  return baseLayout({
    title: 'Submission Approved - PJ Social Portal',
    preheader: `Your ${platform} ${actionType} proof was approved (+${xpAwarded} XP awarded)!`,
    content,
    callToAction: {
      text: 'View Your Leaderboard Rank',
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
  reason = 'The submitted screenshot did not clearly demonstrate valid activity.',
  portalUrl = PORTAL_URL
}) => {
  const content = `
    <h2 style="margin: 0 0 16px 0; color: #0f172a; font-size: 20px; font-weight: 700;">
      Submission Update: Action Required ⚠️
    </h2>
    <p style="margin: 0 0 16px 0; color: #334155; font-size: 15px; line-height: 1.6;">
      Hello <strong>${name || 'Creator'}</strong>, our moderation team has reviewed your submission for <strong>${platform} (${actionType})</strong>. Unfortunately, it could not be approved at this time.
    </p>

    <!-- Feedback Notice Box -->
    <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 18px 20px; margin: 20px 0; border-radius: 4px;">
      <div style="font-size: 13px; font-weight: 700; color: #991b1b; margin-bottom: 6px;">
        Moderator Feedback / Reason:
      </div>
      <div style="font-size: 14px; color: #7f1d1d; line-height: 1.6; font-style: italic;">
        "${reason}"
      </div>
    </div>

    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin: 16px 0; padding: 14px 18px;">
      <tr>
        <td style="padding: 6px 0; font-size: 13px; color: #64748b; width: 120px;"><strong>Submission ID:</strong></td>
        <td style="padding: 6px 0; font-size: 13px; color: #1e293b; font-family: monospace;">${submissionId || 'N/A'}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; font-size: 13px; color: #64748b;"><strong>Platform:</strong></td>
        <td style="padding: 6px 0; font-size: 13px; color: #1e293b;">${platform}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; font-size: 13px; color: #64748b;"><strong>Action Type:</strong></td>
        <td style="padding: 6px 0; font-size: 13px; color: #1e293b;">${actionType}</td>
      </tr>
    </table>

    <p style="margin: 0 0 12px 0; color: #334155; font-size: 14px; line-height: 1.6;">
      You are welcome to re-submit with clear, uncropped proof following our verification guidelines.
    </p>
  `;

  return baseLayout({
    title: 'Submission Status Update - PJ Social Portal',
    preheader: `Your ${platform} submission was not approved. Review moderator feedback.`,
    content,
    callToAction: {
      text: 'Submit New Proof',
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
    <h2 style="margin: 0 0 16px 0; color: #0f172a; font-size: 20px; font-weight: 700;">
      Clarification Requested for Submission 💬
    </h2>
    <p style="margin: 0 0 16px 0; color: #334155; font-size: 15px; line-height: 1.6;">
      Hello <strong>${name || 'Creator'}</strong>, a moderator (<strong>${reviewerName}</strong>) has requested clarification regarding your <strong>${platform} (${actionType})</strong> verification submission.
    </p>

    <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 18px 20px; margin: 20px 0; border-radius: 4px;">
      <div style="font-size: 13px; font-weight: 700; color: #92400e; margin-bottom: 6px;">
        Message from Reviewer:
      </div>
      <div style="font-size: 14px; color: #78350f; line-height: 1.6;">
        "${message || 'Please provide additional context or an updated screenshot for your activity.'}"
      </div>
    </div>

    <p style="margin: 0 0 12px 0; color: #334155; font-size: 14px; line-height: 1.6;">
      Please open the portal to review this request and respond directly so our team can finalize your verification.
    </p>
  `;

  return baseLayout({
    title: 'Clarification Needed - PJ Social Portal',
    preheader: `Moderator requested clarification on your ${platform} submission.`,
    content,
    callToAction: {
      text: 'Respond on Portal',
      url: `${portalUrl}`
    }
  });
};

/**
 * 8. XP Notification Template
 */
const getXPNotificationTemplate = ({
  name,
  xpAmount = 0,
  actionType = 'BONUS',
  reason = 'Institutional Engagement',
  newTotalXP = 0,
  portalUrl = PORTAL_URL
}) => {
  const isPositive = xpAmount >= 0;
  const content = `
    <h2 style="margin: 0 0 16px 0; color: #0f172a; font-size: 20px; font-weight: 700;">
      XP Balance Update ✨
    </h2>
    <p style="margin: 0 0 16px 0; color: #334155; font-size: 15px; line-height: 1.6;">
      Hello <strong>${name || 'Creator'}</strong>, your verified gamification XP has been updated.
    </p>

    <div style="background: linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%); border: 1px solid #ddd6fe; border-radius: 10px; padding: 22px; margin: 20px 0; text-align: center;">
      <div style="font-size: 13px; font-weight: 700; color: #6d28d9; text-transform: uppercase; letter-spacing: 1px;">
        Activity Transaction
      </div>
      <div style="font-size: 32px; font-weight: 800; color: ${isPositive ? '#5b21b6' : '#991b1b'}; margin: 8px 0;">
        ${isPositive ? `+${xpAmount}` : `${xpAmount}`} XP
      </div>
      <div style="font-size: 14px; color: #6d28d9; font-weight: 600;">
        Type: ${actionType} &bull; ${reason}
      </div>
      <div style="font-size: 13px; color: #7c3aed; margin-top: 6px;">
        Current Balance: <strong>${newTotalXP} XP</strong>
      </div>
    </div>

    <p style="margin: 0 0 12px 0; color: #334155; font-size: 14px; line-height: 1.6;">
      Check out your current standings and see how close you are to the next tier!
    </p>
  `;

  return baseLayout({
    title: 'XP Awarded - PJ Social Portal',
    preheader: `You received ${isPositive ? '+' : ''}${xpAmount} XP on PJ Social Portal.`,
    content,
    callToAction: {
      text: 'View Gamification Hub',
      url: `${portalUrl}`
    }
  });
};

/**
 * 9. Level Up Template
 */
const getLevelUpTemplate = ({
  name,
  newLevel = 2,
  levelName = 'Active',
  icon = '⚡',
  totalXP = 0,
  nextLevelXP = 250,
  portalUrl = PORTAL_URL
}) => {
  const content = `
    <h2 style="margin: 0 0 16px 0; color: #0f172a; font-size: 22px; font-weight: 800; text-align: center;">
      🏆 CONGRATULATIONS ON LEVELING UP! 🏆
    </h2>
    <p style="margin: 0 0 20px 0; color: #334155; font-size: 15px; line-height: 1.6; text-align: center;">
      Awesome milestone, <strong>${name || 'Creator'}</strong>! Your consistent verified activities have elevated your profile to a new tier!
    </p>

    <!-- Level Celebration Banner -->
    <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 50%, #f59e0b 100%); border-radius: 12px; padding: 26px 20px; margin: 24px 0; text-align: center; box-shadow: 0 6px 18px rgba(245, 158, 11, 0.25);">
      <div style="font-size: 48px; margin-bottom: 8px;">
        ${icon || '👑'}
      </div>
      <div style="font-size: 13px; font-weight: 800; color: #78350f; text-transform: uppercase; letter-spacing: 2px;">
        UNLOCKED NEW LEVEL
      </div>
      <div style="font-size: 30px; font-weight: 900; color: #451a03; margin: 6px 0;">
        Level ${newLevel}: ${levelName}
      </div>
      <div style="font-size: 14px; font-weight: 700; color: #78350f;">
        Total Verified XP: ${totalXP.toLocaleString()}
      </div>
    </div>

    <p style="margin: 0 0 14px 0; color: #334155; font-size: 14px; line-height: 1.6; text-align: center;">
      Your badge is now proudly displayed on the global institutional leaderboard!
    </p>
  `;

  return baseLayout({
    title: `Level Up: You are now Level ${newLevel}! - PJ Social Portal`,
    preheader: `🏆 You reached Level ${newLevel} (${levelName}) with ${totalXP} verified XP!`,
    content,
    callToAction: {
      text: 'View Your New Badge',
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
  getSubmissionApprovedTemplate,
  getSubmissionRejectedTemplate,
  getClarificationTemplate,
  getXPNotificationTemplate,
  getLevelUpTemplate,
  getTestEmailTemplate
};
