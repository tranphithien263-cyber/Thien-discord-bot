export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ ok: false }); return; }

  try {
    const { token, channel } = req.body;
    if (!token || !channel) {
      res.status(400).json({ ok: false, error: 'Thiếu token hoặc channel' });
      return;
    }

    // 1. Kiểm tra token → lấy thông tin bot
    const botRes = await fetch('https://discord.com/api/v10/users/@me', {
      headers: { 'Authorization': 'Bot ' + token, 'User-Agent': 'DiscordBot (https://github.com/spam, 1.0)' }
    });

    if (botRes.status === 401) {
      res.status(200).json({ ok: false, error: 'Token sai hoặc hết hiệu lực' });
      return;
    }
    if (!botRes.ok) {
      res.status(200).json({ ok: false, error: 'Token lỗi: HTTP ' + botRes.status });
      return;
    }
    const bot = await botRes.json();

    // 2. Kiểm tra channel
    const chRes = await fetch('https://discord.com/api/v10/channels/' + channel, {
      headers: { 'Authorization': 'Bot ' + token, 'User-Agent': 'DiscordBot (https://github.com/spam, 1.0)' }
    });

    if (chRes.status === 404) {
      res.status(200).json({ ok: false, error: 'Channel ID sai hoặc bot không ở trong server đó' });
      return;
    }
    if (chRes.status === 403) {
      res.status(200).json({ ok: false, error: 'Bot không có quyền xem kênh này' });
      return;
    }
    if (!chRes.ok) {
      res.status(200).json({ ok: false, error: 'Channel lỗi: HTTP ' + chRes.status });
      return;
    }
    const ch = await chRes.json();

    // 3. Kiểm tra guild
    let guildName = '(DM/Group)';
    if (ch.guild_id) {
      const gRes = await fetch('https://discord.com/api/v10/guilds/' + ch.guild_id, {
        headers: { 'Authorization': 'Bot ' + token, 'User-Agent': 'DiscordBot (https://github.com/spam, 1.0)' }
      });
      if (gRes.ok) {
        const g = await gRes.json();
        guildName = g.name;
      }
    }

    // 4. Kiểm tra quyền gửi tin trong channel
    let canSend = false;
    if (ch.guild_id) {
      const memberRes = await fetch('https://discord.com/api/v10/guilds/' + ch.guild_id + '/members/' + bot.id, {
        headers: { 'Authorization': 'Bot ' + token, 'User-Agent': 'DiscordBot (https://github.com/spam, 1.0)' }
      });
      if (memberRes.ok) {
        const m = await memberRes.json();
        // Nếu là admin → có mọi quyền
        const admin = (BigInt(m.permissions || '0') & 0x8n) === 0x8n;
        if (admin) canSend = true;
        else {
          // Nếu không admin → check perms Send Messages (0x800)
          const hasSend = (BigInt(m.permissions || '0') & 0x800n) === 0x800n;
          canSend = hasSend;
        }
      }
    } else {
      canSend = true; // DM luôn gửi được
    }

    res.status(200).json({
      ok: true,
      botName: bot.username,
      botDiscriminator: bot.discriminator || '0',
      botId: bot.id,
      channelName: ch.name || 'DM',
      channelType: ch.type,
      guildName: guildName,
      canSend: canSend
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
}
