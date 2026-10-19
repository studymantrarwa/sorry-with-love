const tls = require('tls');

function env(name, fallback='') { return String(process.env[name] || fallback).trim(); }

function sendCommand(socket, command, expectedCodes) {
  return new Promise((resolve, reject) => {
    let buffer = '';
    const onData = chunk => {
      buffer += chunk.toString('utf8');
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() || '';
      for (let i=0;i<lines.length;i++) {
        const line = lines[i];
        if (!/^\d{3}(?: |$)/.test(line)) continue;
        const code = Number(line.slice(0,3));
        if (line[3] === '-') continue;
        cleanup();
        if (!expectedCodes.includes(code)) reject(new Error(`Gmail SMTP ${code}: ${line.slice(4)}`));
        else resolve(code);
        return;
      }
    };
    const onError = e => { cleanup(); reject(e); };
    const cleanup = () => { socket.off('data', onData); socket.off('error', onError); };
    socket.on('data', onData); socket.on('error', onError);
    socket.write(command + '\r\n');
  });
}

function waitGreeting(socket) {
  return new Promise((resolve,reject)=>{
    let buffer='';
    const onData=chunk=>{
      buffer+=chunk.toString('utf8');
      const lines=buffer.split(/\r?\n/); buffer=lines.pop()||'';
      for(const line of lines){ if(/^220[ -]/.test(line)){cleanup();resolve();return;} }
    };
    const onError=e=>{cleanup();reject(e)};
    const cleanup=()=>{socket.off('data',onData);socket.off('error',onError)};
    socket.on('data',onData);socket.on('error',onError);
  });
}

async function sendMail({to, subject, text, html}) {
  const user = env('SMTP_USER');
  const pass = env('SMTP_PASSWORD');
  const host = env('SMTP_HOST','smtp.gmail.com');
  const port = Number(env('SMTP_PORT','465'));
  const from = env('SMTP_FROM_EMAIL', user);
  if (!user || !pass) throw new Error('Gmail SMTP is not configured. Set SMTP_USER and SMTP_PASSWORD in Vercel Environment Variables.');
  if (!from) throw new Error('SMTP_FROM_EMAIL or SMTP_USER is required.');

  const socket = tls.connect({host,port,servername:host,rejectUnauthorized:true});
  try {
    await new Promise((resolve,reject)=>{ socket.once('secureConnect',resolve); socket.once('error',reject); });
    await waitGreeting(socket);
    const ehloHost=(()=>{try{return new URL(env('APP_BASE_URL','http://localhost')).hostname||'localhost'}catch{return 'localhost'}})();
    await sendCommand(socket, `EHLO ${ehloHost}`, [250]);
    await sendCommand(socket, `AUTH LOGIN`, [334]);
    await sendCommand(socket, Buffer.from(user).toString('base64'), [334]);
    await sendCommand(socket, Buffer.from(pass).toString('base64'), [235]);
    await sendCommand(socket, `MAIL FROM:<${from}>`, [250]);
    await sendCommand(socket, `RCPT TO:<${to}>`, [250,251]);
    await sendCommand(socket, `DATA`, [354]);
    const safeSubject = String(subject).replace(/[\r\n]+/g,' ').trim();
    const body = [
      `From: Bhavishya Gyani <${from}>`,
      `To: ${to}`,
      `Subject: ${safeSubject}`,
      'MIME-Version: 1.0',
      'Content-Type: multipart/alternative; boundary="BG_BOUNDARY"',
      '',
      '--BG_BOUNDARY',
      'Content-Type: text/plain; charset=UTF-8',
      'Content-Transfer-Encoding: 8bit',
      '',
      text,
      '',
      '--BG_BOUNDARY',
      'Content-Type: text/html; charset=UTF-8',
      'Content-Transfer-Encoding: 8bit',
      '',
      html,
      '',
      '--BG_BOUNDARY--',
      ''
    ].join('\r\n').replace(/^\./gm,'..');
    await new Promise((resolve,reject)=>{
      let buffer='';
      const onData=chunk=>{
        buffer+=chunk.toString('utf8');
        const lines=buffer.split(/\r?\n/); buffer=lines.pop()||'';
        for(const line of lines){
          if(!/^\d{3}(?: |$)/.test(line)) continue;
          if(line[3]==='-') continue;
          cleanup();
          const code=Number(line.slice(0,3));
          if(code!==250) reject(new Error(`Gmail SMTP ${code}: ${line.slice(4)}`)); else resolve();
          return;
        }
      };
      const onError=e=>{cleanup();reject(e)};
      const cleanup=()=>{socket.off('data',onData);socket.off('error',onError)};
      socket.on('data',onData); socket.on('error',onError);
      socket.write(body + '.\r\n');
    });
    await sendCommand(socket, 'QUIT', [221]);
  } finally {
    socket.end();
    socket.destroy();
  }
}

module.exports = { sendMail };
