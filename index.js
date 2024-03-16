const path = require('node:path');
const os = require('os');
const { program } = require('commander');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const repl = require('node:repl');
var fs = require('node:fs');

program
  .option('-p, --profile <profile>', 'Profile to use for running cleaner', 'default')
  .parse(process.argv);
opts = program.opts();
const userConfigDir = process.env.XDG_CONFIG_HOME || `${require('os').homedir()}/.config`;
const appConfigDir = path.join(userConfigDir,  "wa-cleaner");
const profileDir = path.join(appConfigDir, opts.profile);

fs.mkdirSync(appConfigDir, { recursive: true });
fs.mkdirSync(profileDir, { recursive: true });

console.log(`
Application Config DIR: ${appConfigDir}},
Profile: ${opts.profile}
Profile Dir: ${profileDir}
`);


const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: profileDir
    })
});


// When the client is ready, run this code (only once)
client.once('ready', () => {
  console.log('Client is ready!');


  const r = repl.start('> ');
  Object.defineProperty(r.context, 'client', {
    configurable: false,
    enumerable: true,
    value: client,
  });
  r.on('exit', () => {
    console.log('Bye');
    process.exit();
  });


});

// When the client received QR-Code
client.on('qr', (qr) => {
  console.log('QR RECEIVED', qr);
  qrcode.generate(qr, {small: true});

});

// Start your client
console.log("Establish connection to Whatsapp")
client.initialize();
