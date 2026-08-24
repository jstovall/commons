export function buildReminderEmailHtml({
  heading,
  bodyText,
  ctaLabel,
  ctaUrl,
}: {
  heading: string;
  bodyText: string;
  ctaLabel: string;
  ctaUrl: string;
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
  }
</style></head>
<body class="cw-bg" style="margin:0; padding:0; background-color:#DFDACB; font-family: Verdana, Geneva, sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#DFDACB" class="cw-bg" style="background-color:#DFDACB;">
<tr><td align="center" style="padding: 32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#F8F1DE" class="cw-card" style="max-width:480px; background-color:#F8F1DE; border:2px solid #332B22; border-radius:12px; overflow:hidden;">
<tr><td bgcolor="#7C97A3" align="center" class="cw-header" style="background-color:#7C97A3; padding:28px 24px 24px;">
<div class="cw-wordmark" style="font-family: Georgia, 'Times New Roman', serif; font-style: italic; font-weight: bold; font-size: 36px; color:#EFE6CE;">commons</div>
</td></tr>
<tr><td class="cw-card" style="padding: 32px 28px 8px; background-color:#F8F1DE;">
<p class="cw-heading" style="margin:0 0 4px; font-family: Georgia, serif; font-weight:bold; font-size:22px; color:#332B22;">${heading}</p>
<p class="cw-body-text" style="margin:16px 0 0; font-family: Verdana, sans-serif; font-size:14px; line-height:22px; color:#332B22;">${bodyText}</p>
</td></tr>
<tr><td align="left" class="cw-card" style="padding: 24px 28px 28px; background-color:#F8F1DE;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td bgcolor="#D3A22C" class="cw-button-cell" style="background-color:#D3A22C; border:2px solid #332B22; border-radius:6px; box-shadow: 3px 3px 0 #332B22;">
<a href="${ctaUrl}" target="_blank" class="cw-button-text" style="display:inline-block; padding:12px 22px; font-family: Verdana, sans-serif; font-weight:bold; font-size:14px; color:#332B22; text-decoration:none;">${ctaLabel}</a>
</td></tr></table>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}