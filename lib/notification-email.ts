export function buildNotificationEmailHtml({
  title,
  body,
  linkUrl,
}: {
  title: string;
  body: string;
  linkUrl: string;
}): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8" />
<meta name="color-scheme" content="light" />
<meta name="supported-color-schemes" content="light" />
<style>
  @media (prefers-color-scheme: dark) {
    body, .cw-bg { background-color: #DFDACB !important; }
    .cw-card { background-color: #F8F1DE !important; }
    .cw-header { background-color: #7C97A3 !important; }
    .cw-wordmark { color: #EFE6CE !important; }
    .cw-heading, .cw-body-text { color: #332B22 !important; }
    .cw-button-cell { background-color: #D3A22C !important; }
    .cw-button-text { color: #332B22 !important; }
    .cw-mono { color: #6b6250 !important; }
  }
</style></head>
<body class="cw-bg" style="margin:0; padding:0; background-color:#DFDACB; font-family: Verdana, Geneva, sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#DFDACB" class="cw-bg" style="background-color:#DFDACB;">
<tr><td align="center" style="padding: 32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#F8F1DE" class="cw-card" style="max-width:480px; background-color:#F8F1DE; border:2px solid #332B22; border-radius:12px; overflow:hidden;">
<tr><td bgcolor="#7C97A3" align="center" class="cw-header" style="background-color:#7C97A3; padding:28px 24px 24px;">
<div class="cw-wordmark" style="font-family: Georgia, serif; font-style: italic; font-weight: bold; font-size: 36px; color:#EFE6CE;">commons</div>
</td></tr>
<tr><td class="cw-card" style="padding: 32px 28px 8px; background-color:#F8F1DE;">
<p class="cw-heading" style="margin:0 0 4px; font-family: Georgia, serif; font-weight:bold; font-size:22px; color:#332B22;">${title}</p>
<p class="cw-body-text" style="margin:16px 0 0; font-family: Verdana, sans-serif; font-size:14px; line-height:22px; color:#332B22;">${body}</p>
</td></tr>
<tr><td align="left" class="cw-card" style="padding: 24px 28px 8px; background-color:#F8F1DE;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td bgcolor="#D3A22C" class="cw-button-cell" style="background-color:#D3A22C; border:2px solid #332B22; border-radius:6px; box-shadow: 3px 3px 0 #332B22;">
<a href="${linkUrl}" target="_blank" class="cw-button-text" style="display:inline-block; padding:12px 22px; font-family: Verdana, sans-serif; font-weight:bold; font-size:14px; color:#332B22; text-decoration:none;">Open Commons</a>
</td></tr></table>
</td></tr>
<tr><td class="cw-card" style="padding: 20px 28px 28px; background-color:#F8F1DE;">
<p class="cw-mono" style="margin:0; font-family: 'Courier New', monospace; font-size:11px; color:#6b6250; line-height:18px;">
You're getting this because you have email notifications turned on for Commons. You can switch to push notifications or turn these off anytime from your profile.
</p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}